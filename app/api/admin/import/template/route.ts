import * as XLSX from "xlsx";
import Papa from "papaparse";
import { requireApiRole, STAFF } from "@/lib/auth";
import { route } from "@/lib/api";
import { TEMPLATE_COLUMNS, TEMPLATE_ROWS } from "@/features/question-import/bulk";

export const GET = route(async (req) => {
  await requireApiRole(STAFF);
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  if (format === "json") {
    return new Response(JSON.stringify(TEMPLATE_ROWS, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="iqmath-template.json"' },
    });
  }
  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS, { header: [...TEMPLATE_COLUMNS] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "questions");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="iqmath-template.xlsx"',
      },
    });
  }
  // BOM нь Excel-д кирилл үсгийг зөв харуулна
  const csv = "﻿" + Papa.unparse(TEMPLATE_ROWS, { columns: [...TEMPLATE_COLUMNS] });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="iqmath-template.csv"' } });
});
