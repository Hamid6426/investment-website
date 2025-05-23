import { NextRequest, NextResponse } from "next/server";
import Deposit from "@/models/Deposit";
import connectToDatabase from "@/lib/mongodb";
import { uploadImage } from "@/lib/uploadImage";
import { getUserFromRequest } from "@/lib/getUserFromRequest";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();

    const accountName = formData.get("accountName") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const amount = Number(formData.get("amount"));
    const currency = formData.get("currency") as string;
    const method = formData.get("method") as string;
    const file = formData.get("proofImage") as File | null;

    const errors: string[] = [];

    if (!accountName) errors.push("Missing 'accountName'");
    if (!accountNumber) errors.push("Missing 'accountNumber'");
    if (!currency) errors.push("Missing 'currency'");
    if (!method || !["bank", "easypaisa", "jazzcash"].includes(method))
      errors.push("Invalid or missing 'method'");
    if (isNaN(amount)) errors.push("Invalid 'amount'");

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    let imageUrl = "";
    if (file && file.size > 0) {
      imageUrl = await uploadImage(file);
    }

    const deposit = new Deposit({
      userId: getUserFromRequest(req).id,
      accountName,
      accountNumber,
      amount,
      currency,
      proofImage: imageUrl,
      method,
      status: "pending",
    });

    const saved = await deposit.save();
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const decodedUser = getUserFromRequest(req);

    if (decodedUser.role !== "admin" && decodedUser.role !== "superadmin") {
      return NextResponse.json(
        { error: "Not allowed to check deposits" },
        { status: 401 }
      );
    }
    const deposits = await Deposit.find();

    return NextResponse.json(deposits, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
