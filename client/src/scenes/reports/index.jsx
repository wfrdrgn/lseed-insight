import { useEffect } from "react";
import axios from "axios";
import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  useTheme,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  LinearProgress, // ▼ NEW
} from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import * as XLSX from "xlsx";
import axiosClient from "../../api/axiosClient";

const Reports = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const fileInputRef = useRef(null);

  const [parsedData, setParsedData] = useState({});
  const [fileName, setFileName] = useState("");
  const [selectedSE, setSelectedSE] = useState("");
  const [socialEnterprises, setSocialEnterprises] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState("");

  // ▼ NEW: direct-upload state
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const normalizeColumnName = (colName) => {
    return String(colName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  const columnMapping = {
    financial_statements: {
      date: "date",
      total_revenue: "total_revenue",
      totalrevenue: "total_revenue",
      total_expenses: "total_expenses",
      totalexpenses: "total_expenses",
      net_income: "net_income",
      netincome: "net_income",
      total_assets: "total_assets",
      totalassets: "total_assets",
      total_liabilities: "total_liabilities",
      totalliabilities: "total_liabilities",
      owner_equity: "owner_equity",
      ownerequity: "owner_equity",
    },
    inventory_report: {
      item_name: "item_name",
      itemname: "item_name",
      qty: "qty",
      quantity: "qty",
      price: "price",
      amount: "amount",
    },
    cash_in: {
      date: "date",
      cash: "cash",
      sales: "sales",
      otherRevenue: "otherRevenue",
      rawMaterials: "rawMaterials",
      cashUnderAssets: "cashUnderAssets",
      savings: "savings",
      assets: "assets",
      liability: "liability",
      ownerCapital: "ownerCapital",
      notes: "notes",
      enteredBy: "enteredBy",
    },
    cash_out: {
      date: "date",
      cash: "cash",
      utilities: "utilities",
      officesupplies: "officeSupplies",
      expenses: "expenses",
      cashunderassets: "cashUnderAssets",
      investments: "investments",
      savings: "savings",
      assets: "assets",
      inventory: "inventory",
      liability: "liability",
      ownerswithdrawals: "ownerWithdrawal",
      notes: "notes",
      enteredby: "enteredBy",
    },
  };

  const parseNumericValue = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      const cleanedValue = value.replace(/,/g, "").trim();
      const excelErrorStrings = [
        "#N/A",
        "#REF!",
        "#NAME?",
        "#VALUE!",
        "#DIV/0!",
        "#NULL!",
        "#NUM!",
      ];
      if (excelErrorStrings.includes(cleanedValue.toUpperCase())) {
        return null;
      }
      if (cleanedValue === "") return null;
      const parsed = parseFloat(cleanedValue);
      return isNaN(parsed) ? null : parsed;
    }
    return value;
  };

  // Pass optional reportTypeHint: "cash_in" | "cash_out" | "inventory_report" | "auto"
  const handleFileChange = (event, reportTypeHint = "") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsedData({}); // Reset parsed data

    const ext = file.name.toLowerCase().split(".").pop();
    const reader = new FileReader();

    const parseWorkbook = (wb) => {
      const newParsedData = {};

      const allowedAuto = [
        "cash in", "cash_in",
        "cash out", "cash_out",
        "inventory", "inventory report", "inventory template",
      ];

      const lowerFileName = file.name.toLowerCase();

      const hintFilters = {
        cash_in: (s) =>
          s.includes("cash in") || s.includes("cash_in") ||
          lowerFileName.includes("cash in") || lowerFileName.includes("cash_in"),
        cash_out: (s) =>
          s.includes("cash out") || s.includes("cash_out") ||
          lowerFileName.includes("cash out") || lowerFileName.includes("cash_out"),
        inventory_report: (s) =>
          s.includes("inventory") || s.includes("inventory report") || s.includes("inventory template") ||
          lowerFileName.includes("inventory") || lowerFileName.includes("inventory report") || lowerFileName.includes("inventory template"),
      };

      // 1) Decide which sheets to parse
      let sheetNames = wb.SheetNames.filter((name) => {
        const s = name.toLowerCase();

        if (reportTypeHint === "auto") {
          if (s.includes("financial")) return false;
          return allowedAuto.some((k) => s.includes(k));
        }

        if (reportTypeHint && hintFilters[reportTypeHint]) {
          return hintFilters[reportTypeHint](s);
        }

        // no hint → parse all, rely on detection inside
        return true;
      });

      // 2) Fallback: if hint filtering removed everything (e.g., CSV "Sheet1"), parse all sheets
      if (reportTypeHint && sheetNames.length === 0) {
        sheetNames = [...wb.SheetNames];
      }

      // 3) Single parsing loop
      sheetNames.forEach((sheetName) => {
        const worksheet = wb.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        if (!rawData || rawData.length === 0) return;

        let targetTable = null;
        let dataRows = [];
        let globalReportDate = null;
        let globalItemName = null;

        const lowerSheetName = sheetName.toLowerCase();

        // Detect target table (do not force hint; use it only for filtering above)
        if (lowerSheetName.includes("cash in") || lowerFileName.includes("cash in")) {
          targetTable = "cash_in";
          const dateCell = String(rawData[1]?.[0] || "").trim();
          if (dateCell.toLowerCase().startsWith("month:")) {
            globalReportDate = dateCell.substring(dateCell.indexOf(":") + 1).trim();
          } else if (dateCell.toLowerCase().startsWith("date:")) {
            globalReportDate = dateCell.substring(dateCell.indexOf(":") + 1).trim();
          }
        } else if (lowerSheetName.includes("cash out") || lowerFileName.includes("cash out")) {
          targetTable = "cash_out";
          const dateCell = String(rawData[1]?.[0] || "").trim();
          if (dateCell.toLowerCase().startsWith("month:")) {
            globalReportDate = dateCell.substring(dateCell.indexOf(":") + 1).trim();
          } else if (dateCell.toLowerCase().startsWith("date:")) {
            globalReportDate = dateCell.substring(dateCell.indexOf(":") + 1).trim();
          }
        } else if (
          lowerSheetName.includes("inventory report") ||
          lowerFileName.includes("inventory report") ||
          lowerSheetName.includes("inventory") ||
          lowerFileName.includes("inventory") ||
          selectedReportType === "inventory_report"
        ) {
          targetTable = "inventory_report";

          // month/date from header
          const dateCell = String(rawData[1]?.[0] || "").trim();
          if (dateCell.toLowerCase().startsWith("date:")) {
            globalReportDate = dateCell.substring(dateCell.indexOf(":") + 1).trim();
          } else if (dateCell.toLowerCase().startsWith("month:")) {
            globalReportDate = dateCell.substring(dateCell.indexOf(":") + 1).trim();
          }

          // ---------- Structured INVENTORY extraction ----------
          const items = [];
          const bomLines = [];
          const invReport = [];

          let currentItem = null; // { item_name, item_price, item_beginning_inventory, item_less_count, bom_name }
          const isHeaderRow = (txt) => txt.toLowerCase().startsWith("item name:");
          const isBeginning = (txt) => txt.toLowerCase().startsWith("beginning inventory") || txt.toLowerCase().startsWith("beggining inventory");
          const isLessFinal = (txt) => txt.toLowerCase().startsWith("less: final count");
          const isAddPurchases = (txt) => txt.toLowerCase().startsWith("add: purchases");
          const isEnding = (txt) => txt.toLowerCase().startsWith("ending inventory");
          const isEmpty = (v) => v == null || (typeof v === "string" && v.trim() === "");
          const toNum = (v) => {
            if (v == null) return null;
            if (typeof v === "number") return v;
            const cleaned = String(v).replace(/,/g, "").trim();
            if (cleaned === "") return null;
            const n = parseFloat(cleaned);
            return Number.isFinite(n) ? n : null;
          };

          // ⬇️ ADD THIS HELPER RIGHT HERE
          const isNoise = (txt) => {
            const t = String(txt || "").toLowerCase();
            return (
              t.startsWith("total cost of goods sold") ||
              t.startsWith("weighted average formula") ||
              t.startsWith("price of final count") ||
              t.startsWith("final count") ||
              t.startsWith("total amount of purchases") ||
              t.startsWith("total quantity")
            );
          };

          // Start exactly at the first "Item Name:" so we don't skip the first item
          const firstItemIdx = rawData.findIndex(
            r => String(r?.[0] || "").trim().toLowerCase().startsWith("item name:")
          );
          let invRows = firstItemIdx !== -1 ? rawData.slice(firstItemIdx) : rawData;

          for (const r of invRows) {
            const label = String(r[0] || "").trim();
            const qty = toNum(r[1]);
            const price = toNum(r[2]);
            const amount = toNum(r[3]);

            if (label === "") continue;

            if (isHeaderRow(label)) {
              if (currentItem) {
                items.push(currentItem);
                if (!isEmpty(globalReportDate)) {
                  invReport.push({ month: globalReportDate, item_name: currentItem.item_name });
                }
              }
              const itemName = label.substring(label.indexOf(":") + 1).trim();
              currentItem = {
                item_name: itemName,
                item_price: null,
                item_beginning_inventory: null,
                item_less_count: null,
                bom_name: `${itemName} BOM`,
              };
              continue;
            }

            if (!currentItem) continue;

            if (isBeginning(label)) {
              if (!isEmpty(qty)) currentItem.item_beginning_inventory = qty;
              if (!isEmpty(price)) currentItem.item_price = price;
              continue;
            }

            if (isLessFinal(label)) {
              if (!isEmpty(qty)) currentItem.item_less_count = qty;
              continue;
            }

            // only treat as BOM line if it's not a control/noise row
            const nameLooksLikeMaterial =
              !isBeginning(label) &&
              !isLessFinal(label) &&
              !isAddPurchases(label) &&
              !isEnding(label) &&
              !isNoise(label);

            if (nameLooksLikeMaterial && (!isEmpty(qty) || !isEmpty(price))) {
              bomLines.push({
                bom_name: currentItem.bom_name,
                raw_material_name: label,
                raw_material_price: price || 0,
                raw_material_qty: qty || 0,
              });
            }
          }

          // Close last item
          if (currentItem) {
            items.push(currentItem);
            if (!isEmpty(globalReportDate)) {
              invReport.push({ month: globalReportDate, item_name: currentItem.item_name });
            }
          }

          if (items.length > 0) newParsedData["inventory_items"] = items;
          if (bomLines.length > 0) newParsedData["inventory_bom_lines"] = bomLines;
          if (invReport.length > 0) newParsedData["inventory_report"] = invReport;

          // Important: skip flat inventory parsing to avoid duplicate preview
          return;
        } else if (lowerSheetName.includes("financial statements") || lowerFileName.includes("financial statements")) {
          targetTable = "financial_statements";
        }

        // Allow dropdown override if nothing detected
        if (!targetTable && selectedReportType) {
          targetTable = selectedReportType;
        }
        if (!targetTable) {
          console.warn(`Skipping sheet '${sheetName}' because target table could not be determined.`);
          return;
        }

        // Slice rows
        if (targetTable === "cash_in" || targetTable === "cash_out") {
          dataRows = rawData.length < 6 ? rawData.slice(1) : rawData.slice(5);
        } else if (targetTable === "inventory_report") {
          dataRows = rawData.length < 6 ? rawData.slice(1) : rawData.slice(5);
        } else {
          dataRows = rawData.slice(1);
        }

        // Filter display-only rows
        const filteredDataRows = dataRows.filter((row) => {
          const firstCell = String(row[0] || "").trim().toLowerCase();
          if (
            firstCell.startsWith("totals:") ||
            firstCell.startsWith("(") ||
            firstCell === "less: final count" ||
            firstCell === "add: purchases" ||
            firstCell === "total cost of goods sold" ||
            firstCell === "weighted average formula" ||
            firstCell === "price of final count =" ||
            firstCell === "total amount of purchases" ||
            firstCell === "total quantity" ||
            firstCell === "final count" ||
            firstCell === "final total cost of goods sold"
          ) return false;
          return firstCell !== "";
        });

        let currentActiveItemName = globalItemName;

        const transformedSheetData = filteredDataRows
          .map((row) => {
            const newRow = {};

            if (targetTable === "cash_in") {
              if (globalReportDate !== null) newRow["month"] = globalReportDate;
              const dateValue = String(row[0] || "").trim();
              if (dateValue !== "") newRow["date"] = dateValue;

              const cash = parseNumericValue(row[1]); if (cash !== null) newRow["cash"] = cash;
              const sales = parseNumericValue(row[2]); if (sales !== null) newRow["sales"] = sales;
              const otherRevenue = parseNumericValue(row[3]); if (otherRevenue !== null) newRow["otherRevenue"] = otherRevenue;
              const rawMaterials = parseNumericValue(row[4]); if (rawMaterials !== null) newRow["rawMaterials"] = rawMaterials;
              const cashUnderAssets = parseNumericValue(row[5]); if (cashUnderAssets !== null) newRow["cashUnderAssets"] = cashUnderAssets;
              const savings = parseNumericValue(row[6]); if (savings !== null) newRow["savings"] = savings;

              let totalAssets = 0; let hasAnyAssetComponent = false;
              if (rawMaterials !== null) { totalAssets += rawMaterials; hasAnyAssetComponent = true; }
              if (cashUnderAssets !== null) { totalAssets += cashUnderAssets; hasAnyAssetComponent = true; }
              if (savings !== null) { totalAssets += savings; hasAnyAssetComponent = true; }
              if (totalAssets !== 0) newRow["assets"] = totalAssets; else if (hasAnyAssetComponent) newRow["assets"] = 0;

              const liability = parseNumericValue(row[7]); if (liability !== null) newRow["liability"] = liability;
              const ownerCapital = parseNumericValue(row[8]); if (ownerCapital !== null) newRow["ownerCapital"] = ownerCapital;
              const notesValue = String(row[9] || "").trim(); if (notesValue !== "") newRow["notes"] = notesValue;
              const enteredByValue = String(row[10] || "").trim(); if (enteredByValue !== "") newRow["enteredBy"] = enteredByValue;

            } else if (targetTable === "cash_out") {
              if (globalReportDate !== null) newRow["month"] = globalReportDate;
              const dateValue = String(row[0] || "").trim(); if (dateValue !== "") newRow["date"] = dateValue;

              const cash = parseNumericValue(row[1]); if (cash !== null) newRow["cash"] = cash;
              const utilities = parseNumericValue(row[3]); if (utilities !== null) newRow["utilities"] = utilities;
              const officeSupplies = parseNumericValue(row[4]); if (officeSupplies !== null) newRow["officeSupplies"] = officeSupplies;

              let totalExpenses = 0; let hasAnyExpenseComponent = false;
              if (utilities !== null) { totalExpenses += utilities; hasAnyExpenseComponent = true; }
              if (officeSupplies !== null) { totalExpenses += officeSupplies; hasAnyExpenseComponent = true; }
              if (totalExpenses !== 0) newRow["expenses"] = totalExpenses; else if (hasAnyExpenseComponent) newRow["expenses"] = 0;

              const cashUnderAssets = parseNumericValue(row[10]); if (cashUnderAssets !== null) newRow["cashUnderAssets"] = cashUnderAssets;
              const investments = parseNumericValue(row[11]); if (investments !== null) newRow["investments"] = investments;
              const savings = parseNumericValue(row[12]); if (savings !== null) newRow["savings"] = savings;

              let totalAssets = 0; let hasAnyAssetComponent = false;
              if (cashUnderAssets !== null) { totalAssets += cashUnderAssets; hasAnyAssetComponent = true; }
              if (investments !== null) { totalAssets += investments; hasAnyAssetComponent = true; }
              if (savings !== null) { totalAssets += savings; hasAnyAssetComponent = true; }
              if (totalAssets !== 0) newRow["assets"] = totalAssets; else if (hasAnyAssetComponent) newRow["assets"] = 0;

              const inventory = parseNumericValue(row[13]); if (inventory !== null) newRow["inventory"] = inventory;
              const liability = parseNumericValue(row[14]); if (liability !== null) newRow["liability"] = liability;
              const ownerWithdrawal = parseNumericValue(row[15]); if (ownerWithdrawal !== null) newRow["ownerWithdrawal"] = ownerWithdrawal;

              const notesValue = String(row[16] || "").trim(); if (notesValue !== "") newRow["notes"] = notesValue;
              const enteredByValue = String(row[17] || "").trim(); if (enteredByValue !== "") newRow["enteredBy"] = enteredByValue;

            } else if (targetTable === "inventory_report") {
              if (globalReportDate !== null) newRow["month"] = globalReportDate;

              const rawItemLabel = String(row[0] || "").trim();
              if (rawItemLabel.toLowerCase().startsWith("item name:")) {
                currentActiveItemName = rawItemLabel.substring(rawItemLabel.indexOf(":") + 1).trim();
                return null;
              }

              if (rawItemLabel.toLowerCase() === "beggining inventory" && currentActiveItemName !== null) {
                newRow["item_name"] = currentActiveItemName;
              } else if (rawItemLabel !== "") {
                newRow["item_name"] = rawItemLabel;
              }

              const qty = parseNumericValue(row[1]); if (qty !== null) newRow["qty"] = qty;
              const price = parseNumericValue(row[2]); if (price !== null) newRow["price"] = price;
              const amount = parseNumericValue(row[3]); if (amount !== null) newRow["amount"] = amount;

            } else {
              // financial_statements
              const mainHeader = rawData[0];
              mainHeader.forEach((header, index) => {
                const mappedColName = columnMapping[targetTable]?.[normalizeColumnName(header)];
                if (mappedColName) {
                  let value = row[index];
                  if (typeof value === "string") {
                    const cleanedValue = value.replace(/,/g, "").trim();
                    if (cleanedValue === "") {
                      value = null;
                    } else if (!isNaN(parseFloat(cleanedValue))) {
                      value = parseFloat(cleanedValue);
                    }
                  }
                  if (value !== null && value !== undefined && value !== "") {
                    newRow[mappedColName] = value;
                  }
                }
              });
            }

            return newRow;
          })
          .filter((row) => row !== null && Object.keys(row).length > 0);

        if (transformedSheetData.length > 0) {
          newParsedData[targetTable] = transformedSheetData;
        } else {
          console.warn(`Sheet '${sheetName}' parsed but yielded no valid mapped data. Skipping.`);
        }
      });

      setParsedData(newParsedData);
    };

    // Read file differently for CSV vs XLSX to improve reliability
    if (ext === "csv") {
      reader.onload = (e) => {
        const text = e.target.result;
        const wb = XLSX.read(text, { type: "string" });
        parseWorkbook(wb);
      };
      reader.readAsText(file); // CSV -> text
    } else {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        parseWorkbook(wb);
      };
      reader.readAsArrayBuffer(file); // XLSX -> arraybuffer
    }
  };

  // Get first day of month (YYYY-MM-01) from either "Month: April" or "6/1/2025" etc.
  const monthStartISO = (monthCell, fallbackDate) => {
    // try a full date first
    const tryDate = (s) => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
    };

    if (monthCell && typeof monthCell === "string") {
      const s = monthCell.trim();
      // "April" or "April 2025"
      const m = s.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?$/i);
      if (m) {
        const monthIdx = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
          .indexOf(m[1].toLowerCase());
        const year = m[2] ? parseInt(m[2], 10) : (new Date()).getUTCFullYear();
        return new Date(Date.UTC(year, monthIdx, 1)).toISOString().slice(0, 10);
      }
      // "Month: June 2025" already trimmed in parser → try as date
      const iso = tryDate(s);
      if (iso) return iso;
    }
    if (fallbackDate) {
      const iso = tryDate(fallbackDate);
      if (iso) return iso;
    }
    // default to current month
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
  };

  // Build structured cash-in payload from your parsed rows
  const buildCashInStructured = (rows) => {
    // figure out report_month: use the "month" field of the first row if any, else from date
    const first = rows[0] || {};
    const report_month = monthStartISO(first.month, first.date);

    const transactions = [];
    for (const r of rows) {
      const base = {
        transaction_date: r.date,           // server converts to date
        cash_amount: r.cash ?? null,
        sales_amount: r.sales ?? null,
        other_revenue_amount: r.otherRevenue ?? null,
        liability_amount: r.liability ?? null,
        owners_capital_amount: r.ownerCapital ?? null,
        note: r.notes ?? null,
        entered_by: r.enteredBy ?? null,
      };

      // If there are no asset parts, push a single base transaction
      const assetParts = [
        { name: "Raw Materials", amount: r.rawMaterials },
        { name: "Cash (Assets)", amount: r.cashUnderAssets },
        { name: "Savings", amount: r.savings },
      ].filter(p => p.amount != null && p.amount !== 0);

      if (assetParts.length === 0) {
        transactions.push({ ...base, asset_name: null, asset_amount: null });
      } else {
        // one transaction per asset component (schema has a single asset_id per row)
        for (const p of assetParts) {
          transactions.push({ ...base, asset_name: p.name, asset_amount: p.amount });
        }
      }
    }

    return { report_month, transactions };
  };

  // Build structured cash-out payload from your parsed rows
  const buildCashOutStructured = (rows) => {
    const first = rows[0] || {};
    const report_month = monthStartISO(first.month, first.date);

    const transactions = [];
    for (const r of rows) {
      const base = {
        transaction_date: r.date,
        cash_amount: r.cash ?? null,
        inventory_amount: r.inventory ?? null,
        liability_amount: r.liability ?? null,
        owners_withdrawal_amount: r.ownerWithdrawal ?? null,
        note: r.notes ?? null,
        entered_by: r.enteredBy ?? null,
      };

      // Expenses → separate transactions (utilities, office supplies)
      const expenseParts = [
        { name: "Utilities", amount: r.utilities },
        { name: "Office Supplies", amount: r.officeSupplies },
      ].filter(p => p.amount != null && p.amount !== 0);

      // Assets → separate transactions
      const assetParts = [
        { name: "Cash (Assets)", amount: r.cashUnderAssets },
        { name: "Investments", amount: r.investments },
        { name: "Savings", amount: r.savings },
      ].filter(p => p.amount != null && p.amount !== 0);

      if (expenseParts.length === 0 && assetParts.length === 0) {
        // single base transaction only
        transactions.push({ ...base, expense_name: null, expense_amount: null, asset_name: null, asset_amount: null });
      } else {
        for (const e of expenseParts) {
          transactions.push({ ...base, expense_name: e.name, expense_amount: e.amount, asset_name: null, asset_amount: null });
        }
        for (const a of assetParts) {
          transactions.push({ ...base, expense_name: null, expense_amount: null, asset_name: a.name, asset_amount: a.amount });
        }
      }
    }

    return { report_month, transactions };
  };

  const handleImport = async () => {
    if (!selectedSE) {
      alert("Please select a Social Enterprise before importing.");
      return;
    }
    if (Object.keys(parsedData).length === 0) {
      alert("No data to import. Please upload a file first.");
      return;
    }

    try {
      // INVENTORY (structured)
      if (parsedData.inventory_items || parsedData.inventory_bom_lines || parsedData.inventory_report) {
        const items = parsedData.inventory_items || [];
        const bom_lines = parsedData.inventory_bom_lines || [];
        const report_links = (parsedData.inventory_report || []).map(r => ({
          month: r.month,
          item_name: r.item_name,
        }));

        await axiosClient.post("/api/import/inventory-structured", {
          se_id: selectedSE,
          items,
          bom_lines,
          report_links,
        });
        console.log("Inventory structured import successful");
      }

      // CASH IN (structured)
      if (parsedData.cash_in && parsedData.cash_in.length > 0) {
        const payload = buildCashInStructured(parsedData.cash_in);
        await axiosClient.post("/api/import/cash-in-structured", {
          se_id: selectedSE,
          report_month: payload.report_month,
          transactions: payload.transactions,
        });
        console.log("Cash In structured import successful");
      }

      // CASH OUT (structured)
      if (parsedData.cash_out && parsedData.cash_out.length > 0) {
        const payload = buildCashOutStructured(parsedData.cash_out);
        await axiosClient.post("/api/import/cash-out-structured", {
          se_id: selectedSE,
          report_month: payload.report_month,
          transactions: payload.transactions,
        });
        console.log("Cash Out structured import successful");
      }

      // (Optional) Financial statements (kept as-is if you still want it)
      if (parsedData.financial_statements && parsedData.financial_statements.length > 0) {
        await axiosClient.post("/api/import/financial_statements", {
          se_id: selectedSE,
          data: parsedData.financial_statements,
        });
        console.log("Financial Statements import successful");
      }

      alert("Import completed!");
      setParsedData({});
      setFileName("");
    } catch (err) {
      console.error("Structured import error:", err);
      alert(err?.response?.data?.message || "Import failed. Check console for details.");
    }
  };

  const handleCancel = () => {
    setParsedData({});
    setFileName("");
  };

  const handleSEChange = (event) => {
    setSelectedSE(event.target.value);
  };

  useEffect(() => {
    const fetchSEs = async () => {
      try {
        const response = await axiosClient.get(
          `/api/getAllSocialEnterprisesForComparison`
        );
        setSocialEnterprises(response.data);
      } catch (error) {
        console.error("Error fetching SE list:", error);
      }
    };

    fetchSEs();
  }, []);

  const reportTables = ["financial_statements", "cash_in", "cash_out", "inventory_report"];

  const formatTableName = (name) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // ▼ NEW: direct-upload helpers
  const ensureSE = () => {
    if (!selectedSE) {
      alert("Please select a Social Enterprise first.");
      return false;
    }
    return true;
  };

  const sendFile = async (file, reportTypeHint /* "cash_in"|"cash_out"|"inventory_report"|"auto" */) => {
    if (!ensureSE() || !file) return;
    setUploading(true);
    setUploadMsg("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("se_id", selectedSE);
      fd.append("report_type_hint", reportTypeHint);

      const { data } = await axiosClient.post("/api/import-file", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadMsg(
        data?.imported ? `✅ Imported ${data.imported} row(s).` : "✅ Import complete."
      );
    } catch (err) {
      console.error("[upload] error:", err);
      setUploadMsg(`❌ ${err?.response?.data?.message || err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e, hint) => {
    const f = e.target.files?.[0];
    if (!f) return;
    void sendFile(f, hint);
    e.target.value = ""; // allow same-file reselect
  };

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="Upload Financial Report" subtitle="Upload Financial Reports" />
      </Box>

      {/* Dropdown on top */}
      <Box display="flex" flexDirection="column" alignItems="left" gap={4} mt={4}>
        <Box width="27%" bgcolor={colors.primary[400]} display="flex" padding={2} gap={2}>
          <FormControl
            fullWidth
            sx={{ maxWidth: "500px", backgroundColor: colors.blueAccent[500] }}
          >
            <InputLabel id="se-select-label" sx={{ color: "white" }}>
              Select Social Enterprise
            </InputLabel>
            <Select
              labelId="se-select-label"
              value={selectedSE}
              label="Select Social Enterprise"
              onChange={handleSEChange}
              sx={{
                color: "white",
                ".MuiOutlinedInput-notchedOutline": { border: 0 },
                "& .MuiSvgIcon-root": { color: "white" },
              }}
            >
              {socialEnterprises.map((se) => (
                <MenuItem key={se.se_id} value={se.se_id} sx={{ color: "white" }}>
                  {se.abbr}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Upload Section */}
      <Box display="flex" flexDirection="column" alignItems="center" gap={4} mt={4}>
        {/* B) Preview-first buttons with explicit hints */}
        <Box
          width="100%"
          bgcolor={colors.primary[400]}
          display="flex"
          flexDirection="column"
          gap={2}
          p={2}
        >
          <Typography variant="h5" color={colors.greenAccent[500]}>
            Or choose a specific type (Preview → Import)
          </Typography>

          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Cash In */}
            <input
              id="upload-cashin"
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => { handleFileChange(e, "cash_in"); e.target.value = ""; }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={() => document.getElementById("upload-cashin")?.click()}
            >
              Upload Cash In
            </Button>

            {/* Cash Out */}
            <input
              id="upload-cashout"
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => { handleFileChange(e, "cash_out"); e.target.value = ""; }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={() => document.getElementById("upload-cashout")?.click()}
            >
              Upload Cash Out
            </Button>

            {/* Inventory Report */}
            <input
              id="upload-inventory"
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => { handleFileChange(e, "inventory_report"); e.target.value = ""; }}
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={() => document.getElementById("upload-inventory")?.click()}
            >
              Upload Inventory Report
            </Button>

            {/* Workbook (auto-extract tabs: cash_in / cash_out / inventory_report only) */}
            <input
              id="upload-workbook"
              type="file"
              accept=".xlsx,.csv"  /* now accepts CSV too */
              hidden
              onChange={(e) => { handleFileChange(e, "auto"); e.target.value = ""; }}
            />
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => document.getElementById("upload-workbook")?.click()}
            >
              Upload Workbook (auto-extract tabs)
            </Button>
          </Box>
        </Box>

        {/* Preview (kept) */}
        {Object.keys(parsedData).length > 0 && (
          <Box mt={2} width="100%" bgcolor={colors.primary[400]} p={2}>
            <Typography variant="h4" color={colors.greenAccent[500]} mb={2}>
              Preview: {fileName}
            </Typography>

            {Object.keys(parsedData).map((reportTypeKey) => (
              <Box key={reportTypeKey} mb={4}>
                <Typography variant="h5" color={colors.grey[100]} mb={1}>
                  {formatTableName(reportTypeKey)} Data Preview (First 5 Rows)
                </Typography>
                <Box
                  sx={{
                    overflowX: "auto",
                    maxHeight: "300px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "10px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {parsedData[reportTypeKey] &&
                          parsedData[reportTypeKey].length > 0 &&
                          Object.keys(parsedData[reportTypeKey][0]).map((key) => (
                            <th
                              key={key}
                              style={{
                                border: "1px solid #ddd",
                                padding: "8px",
                                background: "#222",
                                color: "#fff",
                              }}
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData[reportTypeKey] &&
                        parsedData[reportTypeKey].slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            {parsedData[reportTypeKey] &&
                              parsedData[reportTypeKey].length > 0 &&
                              Object.keys(parsedData[reportTypeKey][0]).map((key, i) => (
                                <td
                                  key={i}
                                  style={{
                                    border: "1px solid #ddd",
                                    padding: "8px",
                                    color: "#eee",
                                  }}
                                >
                                  {row[key]}
                                </td>
                              ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            ))}

            <Box display="flex" gap={2} mt={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleImport}
                disabled={Object.keys(parsedData).length === 0 || !selectedSE}
              >
                Import to Database
              </Button>
              <Button variant="outlined" color="error" onClick={handleCancel}>
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Reports;