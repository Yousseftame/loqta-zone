/**
 * Custom date-range financial statement + Excel export.
 * Uses finance-period-report.ts — same P&L rules as NetProfitLoss / Monthly P&L.
 */

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Alert,
} from "@mui/material";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { colors } from "../../Products/products-data";
import type { Transaction, Owner, FinanceStats } from "../finance-data";
import { CATEGORY_LABEL } from "../finance-data";
import {
  buildPeriodFinancialStatement,
  parsePeriodRangeInputs,
  type PeriodFinancialStatement,
} from "../finance-period-report";
import { downloadPeriodReportExcel } from "../period-report-excel";
import { buildLedgerMetaByTxId, fmtBalanceCell } from "../finance-ledger-balance";
import { usePaymentAccounts } from "@/hooks/usePaymentAccounts";

interface Props {
  transactions: Transaction[];
  owners: Owner[];
  stats: FinanceStats;
  loading?: boolean;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultFromDate(): string {
  const n = new Date();
  return toInputDate(new Date(n.getFullYear(), n.getMonth(), 1));
}

function defaultToDate(): string {
  return toInputDate(new Date());
}

function fmtEGP(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-EG");
  return n < 0 ? `−${abs}` : abs;
}

export default function PeriodFinancialReportTab({
  transactions,
  owners,
  stats,
  loading = false,
}: Props) {
  const [fromIso, setFromIso] = useState(defaultFromDate);
  const [toIso, setToIso] = useState(defaultToDate);
  const [statement, setStatement] = useState<PeriodFinancialStatement | null>(
    null,
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(0);
  const [txRowsPerPage, setTxRowsPerPage] = useState(25);

  /** Changing dates invalidates the last generated view so ranges cannot be confused. */
  useEffect(() => {
    setStatement(null);
    setParseError(null);
    setTxPage(0);
  }, [fromIso, toIso]);

  useEffect(() => {
    setTxPage(0);
  }, [statement]);

  const { accounts: paymentAccounts } = usePaymentAccounts();

  const ownerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of owners) m.set(o.id, o.name);
    return m;
  }, [owners]);

  /** Same running balance / method / done-by as the main Transactions table. */
  const ledgerMetaByTxId = useMemo(
    () => buildLedgerMetaByTxId(transactions, stats, paymentAccounts),
    [transactions, stats, paymentAccounts],
  );

  /**
   * Rebuilds the statement from the latest `transactions` prop (already kept
   * current by useFinance’s Firestore listener). Each click runs a fresh pass.
   */
  const runReport = useCallback(() => {
    const parsed = parsePeriodRangeInputs(fromIso, toIso);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setStatement(null);
      return;
    }
    setParseError(null);
    setStatement(
      buildPeriodFinancialStatement(
        transactions,
        parsed.fromInclusive,
        parsed.toExclusive,
      ),
    );
  }, [fromIso, toIso, transactions]);

  const handleExport = useCallback(() => {
    if (!statement) {
      toast.error("Generate the report first.");
      return;
    }
    try {
      const fromStr = statement.fromInclusive.toLocaleDateString("en-CA");
      const toStr = new Date(
        statement.toExclusive.getTime() - 1,
      ).toLocaleDateString("en-CA");
      downloadPeriodReportExcel(
        statement,
        `Loqta_finance_statement_${fromStr}_to_${toStr}`,
        { stats, allTransactions: transactions, paymentAccounts },
      );
      toast.success("Excel file downloaded.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Export failed");
    }
  }, [statement, stats, transactions, paymentAccounts]);

  const s = statement?.summary;

  const txInRange = statement?.transactionsSorted ?? [];
  const txPageStart = txPage * txRowsPerPage;
  const txPageRows = txInRange.slice(txPageStart, txPageStart + txRowsPerPage);

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{ color: colors.textSecondary, mb: 2, maxWidth: 720 }}
      >
        Statement is built from your loaded{" "}
        <strong>finance transactions</strong> (income, expenses, transfers, owner
        movements, purchase-linked expenses/refunds).{" "}
        <strong>{"Net P&L"}</strong> matches <strong>{"Monthly P&L History"}</strong>{" "}
        for the same dates. Transfers do not change{" "}
        <strong>{"Net P&L"}</strong> but appear on their own sheet.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "flex-end",
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: colors.textMuted, display: "block" }}
            >
              From
            </Typography>
            <input
              type="date"
              value={fromIso}
              onChange={(e) => setFromIso(e.target.value)}
              disabled={loading}
              style={{
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.85rem",
              }}
            />
          </Box>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: colors.textMuted, display: "block" }}
            >
              To
            </Typography>
            <input
              type="date"
              value={toIso}
              onChange={(e) => setToIso(e.target.value)}
              disabled={loading}
              style={{
                padding: "8px 10px",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: "0.85rem",
              }}
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={16} />}
            onClick={runReport}
            disabled={loading}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: colors.primary,
            }}
          >
            Generate statement
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileSpreadsheet size={16} />}
            onClick={handleExport}
            disabled={loading || !statement}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              borderColor: colors.border,
            }}
          >
            Export Excel
          </Button>
        </Box>
        <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: colors.textMuted }}>
          Each run uses the <strong>latest transaction list</strong> already loaded in Finance
          (Firestore listener). After adding or editing transactions, click{" "}
          <strong>Generate statement</strong> again to refresh the numbers and export.
        </Typography>
      </Paper>

      {parseError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {parseError}
        </Alert>
      )}

      {statement && s && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              { label: "Net P&L", value: s.net, color: s.net >= 0 ? "#059669" : "#DC2626" },
              { label: "Income", value: s.income, color: "#059669" },
              { label: "Expenses", value: s.expenses, color: "#DC2626" },
              { label: "Owner draws (net)", value: s.ownerDraws, color: "#D97706" },
            ].map((card) => (
              <Paper
                key={card.label}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: card.color, mt: 0.5 }}
                >
                  {fmtEGP(card.value)} EGP
                </Typography>
              </Paper>
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Transfers in period (not in P&L): {statement.transfers.count} · Sum of
            amounts: {fmtEGP(statement.transfers.volume)} EGP
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 3,
              mb: 3,
            }}
          >
            <Paper
              elevation={0}
              sx={{ borderRadius: 2, border: `1px solid ${colors.border}` }}
            >
              <Box sx={{ px: 2, py: 1.5, bgcolor: colors.primaryBg }}>
                <Typography fontWeight={700} fontSize="0.85rem">
                  Income by category
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(statement.incomeByCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell>
                            {CATEGORY_LABEL[k] ?? k}
                          </TableCell>
                          <TableCell align="right">{fmtEGP(v)}</TableCell>
                        </TableRow>
                      ))}
                    {Object.keys(statement.incomeByCategory).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2}>No income in range</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper
              elevation={0}
              sx={{ borderRadius: 2, border: `1px solid ${colors.border}` }}
            >
              <Box sx={{ px: 2, py: 1.5, bgcolor: colors.primaryBg }}>
                <Typography fontWeight={700} fontSize="0.85rem">
                  Expenses by category
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(statement.expenseByCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell>
                            {CATEGORY_LABEL[k] ?? k}
                          </TableCell>
                          <TableCell align="right">{fmtEGP(v)}</TableCell>
                        </TableRow>
                      ))}
                    {Object.keys(statement.expenseByCategory).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2}>No expenses in range</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          <Paper
            elevation={0}
            sx={{ borderRadius: 2, border: `1px solid ${colors.border}`, mb: 3 }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: colors.primaryBg }}>
              <Typography fontWeight={700} fontSize="0.85rem">
                Owner activity
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Owner</TableCell>
                    <TableCell align="right">Withdrawals</TableCell>
                    <TableCell align="right">Returns</TableCell>
                    <TableCell align="right">Net to owner</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statement.ownerActivity.map((r) => (
                    <TableRow key={r.ownerId}>
                      <TableCell>
                        {ownerNameById.get(r.ownerId) ?? r.displayName}
                        {r.ownerId !== "_unknown" && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ display: "block", color: colors.textMuted }}
                          >
                            {r.ownerId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{fmtEGP(r.withdrawals)}</TableCell>
                      <TableCell align="right">{fmtEGP(r.returns)}</TableCell>
                      <TableCell align="right">{fmtEGP(r.netToOwner)}</TableCell>
                    </TableRow>
                  ))}
                  {statement.ownerActivity.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        No owner withdrawals or returns in range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper
            elevation={0}
            sx={{ borderRadius: 2, border: `1px solid ${colors.border}` }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: colors.primaryBg }}>
              <Typography fontWeight={700} fontSize="0.85rem">
                Transactions in range (newest first) — preview
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 420, overflowX: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Balance after</TableCell>
                    <TableCell>Done by</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {txPageRows.map((tx) => {
                    const meta = ledgerMetaByTxId.get(tx.id);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {tx.createdAt?.toLocaleDateString("en-EG") ?? "—"}
                        </TableCell>
                        <TableCell>{tx.type}</TableCell>
                        <TableCell>
                          {CATEGORY_LABEL[tx.category] ?? tx.category}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 140,
                            fontSize: "0.75rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={meta?.methodLabel}
                        >
                          {meta?.methodLabel ?? "—"}
                        </TableCell>
                        <TableCell align="right">{fmtEGP(tx.amount)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {fmtBalanceCell(meta?.balanceAfter ?? null)}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 120,
                            fontSize: "0.75rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={meta?.doneBy}
                        >
                          {meta?.doneBy ?? "—"}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={tx.note}
                        >
                          {tx.note}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={txInRange.length}
              page={txPage}
              onPageChange={(_e, p) => setTxPage(p)}
              rowsPerPage={txRowsPerPage}
              onRowsPerPageChange={(e) => {
                setTxRowsPerPage(parseInt(e.target.value, 10));
                setTxPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </>
      )}

      {loading && !statement && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Loading transactions…
        </Typography>
      )}

      {!statement && !parseError && !loading && (
        <Typography variant="body2" color="text.secondary">
          Pick a date range, then click <strong>Generate statement</strong> to build the report
          from the current data.
        </Typography>
      )}
    </Box>
  );
}
