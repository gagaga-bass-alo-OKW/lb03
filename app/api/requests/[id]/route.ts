import { NextResponse } from "next/server";
import { isRequestStatus, updateRequestStatus } from "@/lib/requestStatus";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// Slack のリンク（?token=付き）から開いた本のページのボタンで使う
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      token,
    }: {
      status?: string;
      token?: string;
    } = body;

    if (!status || !token) {
      return NextResponse.json(
        { error: "status または token が不足しています" },
        { status: 400 }
      );
    }

    if (!isRequestStatus(status)) {
      return NextResponse.json(
        { error: "status が不正です" },
        { status: 400 }
      );
    }

    // ✅ tokenチェック（H列）
    const result = await updateRequestStatus(id, status, (row) => row[7] === token);

    if (result === "not_found") {
      return NextResponse.json(
        { error: "申請が見つかりません" },
        { status: 404 }
      );
    }

    if (result === "forbidden") {
      return NextResponse.json(
        { error: "tokenが不正です" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      status,
    });
  } catch (error) {
    console.error("PATCH API エラー:", error);

    return NextResponse.json(
      {
        error: "更新に失敗しました",
      },
      { status: 500 }
    );
  }
}
