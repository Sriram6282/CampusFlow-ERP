
import { Router } from "express";
import { supabase } from "./superbase";

const router = Router();

// GET fee dashboard summary
router.get("/summary", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("student_fees")
      .select("total_amount, paid_amount, status");

    if (error) throw error;

    const records = data || [];

    const totalFees = records.reduce(
      (sum, item) => sum + Number(item.total_amount), 0
    );

    const collected = records.reduce(
      (sum, item) => sum + Number(item.paid_amount), 0
    );

    const pending = records.reduce(
      (sum, item) => sum + Math.max(
        0, Number(item.total_amount) - Number(item.paid_amount)
      ), 0
    );

    const overdue = records
      .filter(item => item.status === "Overdue")
      .reduce(
        (sum, item) => sum + Math.max(
          0, Number(item.total_amount) - Number(item.paid_amount)
        ), 0
      );

    res.json({
      success: true,
      summary: { totalFees, collected, pending, overdue }
    });
  } catch (error) {
    console.error("Fee summary error:", error);
    res.status(500).json({ success: false, message: "Failed to load fee summary" });
  }
});

// GET all student fee records
router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("student_fees")
      .select(`
        *,
        students (id, roll_number, full_name, department, email)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, fees: data || [] });
  } catch (error) {
    console.error("Fee records error:", error);
    res.status(500).json({ success: false, message: "Failed to load fee records" });
  }
});

// CREATE student fee record
router.post("/", async (req, res) => {
  try {
    const { student_id, semester, total_amount, due_date } = req.body;

    if (!student_id || !semester || total_amount == null || !due_date ||
        Number(total_amount) <= 0 || Number(total_amount) > 10000000) {
      return res.status(400).json({ success: false, message: "Invalid fee details" });
    }

    const { data, error } = await supabase
      .from("student_fees")
      .insert({
        student_id,
        semester,
        total_amount,
        due_date,
        paid_amount: 0,
        status: new Date(due_date) < new Date() ? "Overdue" : "Pending"
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, fee: data });
  } catch (error) {
    console.error("Create fee error:", error);
    res.status(500).json({ success: false, message: "Failed to create fee record" });
  }
});

// RECORD MOCK PAYMENT
router.post("/:feeId/payments", async (req, res) => {
  try {
    const feeId = Number(req.params.feeId);
    const amount = Number(req.body.amount);
    const paymentMethod = req.body.payment_method || "Cash";

    if (!Number.isInteger(feeId) || feeId <= 0 ||
        !Number.isFinite(amount) || amount <= 0 ||
        !["Cash", "UPI", "Card", "Bank Transfer"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment details" });
    }

    const { data: fee, error: feeError } = await supabase
      .from("student_fees")
      .select("*")
      .eq("id", feeId)
      .single();

    if (feeError || !fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    const balance = Number(fee.total_amount) - Number(fee.paid_amount);

    if (amount > balance) {
      return res.status(400).json({ success: false, message: "Payment exceeds remaining balance" });
    }

    const reference = `DEMO-${Date.now()}`;
    const newPaidAmount = Number(fee.paid_amount) + amount;
    const newStatus = newPaidAmount >= Number(fee.total_amount)
      ? "Paid"
      : new Date(fee.due_date) < new Date() ? "Overdue" : "Pending";

    const { data: payment, error: paymentError } = await supabase
      .from("fee_payments")
      .insert({
        student_fee_id: feeId,
        amount,
        payment_method: paymentMethod,
        transaction_reference: reference
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    const { error: updateError } = await supabase
      .from("student_fees")
      .update({ paid_amount: newPaidAmount, status: newStatus })
      .eq("id", feeId);

    if (updateError) {
      await supabase.from("fee_payments").delete().eq("id", payment.id);
      throw updateError;
    }

    res.status(201).json({
      success: true,
      payment,
      receipt: {
        reference,
        amount,
        payment_method: paymentMethod,
        payment_date: payment.payment_date
      }
    });
  } catch (error) {
    console.error("Fee payment error:", error);
    res.status(500).json({ success: false, message: "Failed to record payment" });
  }
});

// GET payment history for a fee record
router.get("/:feeId/payments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("student_fee_id", Number(req.params.feeId))
      .order("payment_date", { ascending: false });

    if (error) throw error;

    res.json({ success: true, payments: data || [] });
  } catch (error) {
    console.error("Payment history error:", error);
    res.status(500).json({ success: false, message: "Failed to load payment history" });
  }
});

export default router;
