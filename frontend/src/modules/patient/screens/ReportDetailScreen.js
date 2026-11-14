// ReportDetailScreen — a full lab report with its analysis + PDF download.
//
// Tapping a report opens this: the header status, plain-language suggestions
// for anything out of range, and the complete results table with reference
// ranges. "Download PDF" renders a proper hospital report:
//   Capital Hospital · Capital Development Authority (CDA) · G-6/2, Islamabad

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SkeletonList, SkeletonCard } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import useBottomInset from '../../../hooks/useBottomInset';
import reportsService from '../services/reportsService';
import { useTheme } from "../../../context/ThemeContext";
import { COLORS } from "../../../theme"; // static brand palette for module-scope maps; components shadow it via useTheme()
const STATUS_COLOR = {
  normal: COLORS.success,
  high: COLORS.danger,
  low: '#3B82F6',
  abnormal: COLORS.warning
};
const STATUS_LABEL = {
  normal: 'Normal',
  high: 'High',
  low: 'Low',
  abnormal: 'Abnormal'
};
export default function ReportDetailScreen({
  navigation,
  route
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset();
  const reportId = route.params?.reportId;
  const [loading, setLoading] = useMinLoading(true);
  const [data, setData] = useState(null); // { report, analysis }
  const [downloading, setDownloading] = useState(false);
  const [prompt, setPrompt] = useState({
    visible: false
  });
  const closePrompt = () => setPrompt({
    visible: false
  });
  const load = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      return;
    }
    try {
      const res = await reportsService.getOne(reportId);
      setData(res || null);
    } catch (e) {/* offline */} finally {
      setLoading(false);
    }
  }, [reportId]);
  useEffect(() => {
    load();
  }, [load]);
  const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : '—';
  const buildHtml = () => {
    const {
      report,
      analysis
    } = data;
    const p = report.patient || {};
    const rows = analysis.results.map(r => {
      const color = STATUS_COLOR[r.status] || '#334155';
      const flag = r.status === 'normal' ? '' : ` style="color:${color};font-weight:700"`;
      return `<tr>
        <td>${r.name}</td>
        <td${flag}>${r.value}${r.unit ? ' ' + r.unit : ''}</td>
        <td>${r.range || '—'}</td>
        <td${flag}>${STATUS_LABEL[r.status] || r.status}</td>
      </tr>`;
    }).join('');
    return `<html><head><meta charset="utf-8"><style>
      * { font-family: Helvetica, Arial, sans-serif; }
      body { padding: 28px; color: #1E293B; }
      .hosp { text-align:center; border-bottom:3px solid #0BAA9D; padding-bottom:12px; margin-bottom:16px; }
      .hosp h1 { margin:0; font-size:24px; letter-spacing:1px; color:#0BAA9D; }
      .hosp .cda { font-size:13px; font-weight:700; color:#334155; margin-top:2px; }
      .hosp .addr { font-size:12px; color:#64748B; margin-top:2px; }
      .meta { display:flex; justify-content:space-between; font-size:12px; margin-bottom:14px; }
      .meta div { line-height:1.6; }
      .title { text-align:center; font-size:16px; font-weight:800; margin:8px 0 14px; }
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th { background:#0BAA9D18; text-align:left; padding:8px; color:#0f766e; }
      td { padding:8px; border-bottom:1px solid #eee; }
      .remarks { margin-top:16px; font-size:12px; background:#F8FAFC; border-radius:8px; padding:12px; }
      .foot { margin-top:22px; text-align:center; font-size:11px; color:#64748B; border-top:1px solid #e2e8f0; padding-top:10px; }
      .stamp { margin-top:20px; font-size:11px; color:#94a3b8; }
    </style></head><body>
      <div class="hosp">
        <h1>CAPITAL HOSPITAL</h1>
        <div class="cda">Capital Development Authority (CDA)</div>
        <div class="addr">G-6/2, Islamabad · ${report.labName || 'Clinical Laboratory'}</div>
      </div>
      <div class="meta">
        <div>
          <b>Patient:</b> ${p.name || '—'}<br/>
          <b>Age/Gender:</b> ${p.age || '—'}${p.gender ? ' / ' + p.gender : ''}<br/>
          <b>MRN/Card:</b> ${p.mrn || '—'}
        </div>
        <div style="text-align:right">
          <b>Report No:</b> ${report.reportNumber || '—'}<br/>
          <b>Collected:</b> ${fmt(report.collectedAt)}<br/>
          <b>Reported:</b> ${fmt(report.reportedAt)}
        </div>
      </div>
      <div class="title">${report.title}${report.referredBy ? ` — Referred by ${report.referredBy}` : ''}</div>
      <table>
        <tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Status</th></tr>
        ${rows}
      </table>
      <div class="remarks"><b>Impression:</b> ${analysis.summary}${report.remarks ? '<br/><b>Remarks:</b> ' + report.remarks : ''}</div>
      <div class="stamp">This is a system-generated report from SehatLine. Verified by the issuing laboratory.</div>
      <div class="foot">Capital Hospital · CDA · G-6/2, Islamabad — SehatLine Digital Health</div>
    </body></html>`;
  };
  const download = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const {
        uri
      } = await Print.printToFileAsync({
        html: buildHtml(),
        base64: false
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Report PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        setPrompt({
          visible: true,
          variant: 'success',
          icon: 'checkmark-circle',
          title: 'PDF Ready',
          message: 'Report PDF generated.',
          primaryLabel: 'OK',
          onPrimary: closePrompt
        });
      }
    } catch (e) {
      setPrompt({
        visible: true,
        variant: 'warning',
        icon: 'alert-circle',
        title: 'Download Failed',
        message: 'Could not generate the PDF. Please try again.',
        primaryLabel: 'OK',
        onPrimary: closePrompt
      });
    } finally {
      setDownloading(false);
    }
  };

  // Open a lab-uploaded PDF (stored as base64 on the report). Written to a cache
  // file and handed to the OS viewer / share sheet.
  const openUploadedPdf = async () => {
    try {
      const report = data?.report;
      if (!report?.pdfData) return;
      setDownloading(true);
      const FileSystem = require('expo-file-system/legacy');
      const safe = (report.pdfName || `${report.reportNumber || 'report'}.pdf`).replace(/[^\w.\-]/g, '_');
      const uri = `${FileSystem.cacheDirectory}${safe}`;
      await FileSystem.writeAsStringAsync(uri, report.pdfData, { encoding: 'base64' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: report.title || 'Lab Report', UTI: 'com.adobe.pdf' });
      }
    } catch (e) {
      setPrompt({ visible: true, variant: 'warning', icon: 'alert-circle', title: 'Could not open PDF', message: 'The report PDF could not be opened.', primaryLabel: 'OK', onPrimary: closePrompt });
    } finally {
      setDownloading(false);
    }
  };
  if (loading) {
    return <View style={styles.container}>
        <ScreenHeader title="Report" onBack={() => navigation.goBack()} />
        <View style={{ padding: 16 }}><SkeletonCard /><SkeletonCard style={{ marginTop: 14 }} /></View>
      </View>;
  }
  if (!data) {
    return <View style={styles.container}>
        <ScreenHeader title="Report" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={styles.muted}>Report not found.</Text></View>
      </View>;
  }
  const {
    report,
    analysis
  } = data;
  const abnormal = analysis.overall === 'Abnormal';
  const headColor = abnormal ? COLORS.danger : COLORS.success;
  return <View style={styles.container}>
      <ScreenHeader title="Report" subtitle={report.reportNumber} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      padding: 20,
      paddingBottom: bottomInset + 90
    }}>
        {/* Header status */}
        <View style={[styles.headCard, {
        borderColor: headColor + '40'
      }]}>
          <View style={[styles.headIcon, {
          backgroundColor: headColor + '15'
        }]}>
            <Ionicons name={abnormal ? 'alert-circle' : 'checkmark-circle'} size={26} color={headColor} />
          </View>
          <Text style={styles.headTitle}>{report.title}</Text>
          <Text style={styles.headMeta}>{fmt(report.reportedAt)}{report.referredBy ? ` • ${report.referredBy}` : ''}</Text>
          <View style={[styles.overallPill, {
          backgroundColor: headColor + '15'
        }]}>
            <Text style={[styles.overallText, {
            color: headColor
          }]}>{analysis.overall} — {analysis.abnormalCount}/{analysis.total} out of range</Text>
          </View>
        </View>

        {/* PDF-only report note (uploaded by the lab, no structured values) */}
        {!!report.pdfData && analysis.total === 0 && (
          <View style={styles.pdfNote}>
            <Ionicons name="document-text" size={22} color={COLORS.primary} />
            <Text style={styles.pdfNoteText}>Your laboratory has sent this report as a PDF. Tap “Open PDF” below to view it.</Text>
          </View>
        )}

        {/* Suggestions */}
        <Text style={styles.sectionTitle}>What this means</Text>
        <Text style={styles.summary}>{analysis.summary}</Text>
        {analysis.suggestions.map((s, i) => {
        const color = s.severity === 'warn' ? COLORS.warning : s.severity === 'good' ? COLORS.success : COLORS.primary;
        const icon = s.severity === 'warn' ? 'warning' : s.severity === 'good' ? 'checkmark-circle' : 'information-circle';
        return <View key={i} style={[styles.suggestion, {
          borderLeftColor: color
        }]}>
              <Ionicons name={icon} size={18} color={color} />
              <View style={{
            flex: 1
          }}>
                {!!s.param && <Text style={styles.suggestionParam}>{s.param}</Text>}
                <Text style={styles.suggestionText}>{s.text}</Text>
              </View>
            </View>;
      })}

        {/* Results table */}
        <Text style={styles.sectionTitle}>All Results</Text>
        <View style={styles.table}>
          <View style={[styles.trow, styles.thead]}>
            <Text style={[styles.th, {
            flex: 2
          }]}>Test</Text>
            <Text style={[styles.th, {
            flex: 1.3
          }]}>Result</Text>
            <Text style={[styles.th, {
            flex: 1.4
          }]}>Range</Text>
            <Text style={[styles.th, {
            flex: 1
          }]}>Status</Text>
          </View>
          {analysis.results.map((r, i) => {
          const color = STATUS_COLOR[r.status] || COLORS.textSecondary;
          const bad = r.status !== 'normal';
          return <View key={i} style={[styles.trow, bad && {
            backgroundColor: color + '08'
          }]}>
                <Text style={[styles.td, {
              flex: 2,
              fontWeight: '600'
            }]}>{r.name}</Text>
                <Text style={[styles.td, {
              flex: 1.3,
              color,
              fontWeight: bad ? '800' : '600'
            }]}>{r.value}{r.unit ? ` ${r.unit}` : ''}</Text>
                <Text style={[styles.td, {
              flex: 1.4,
              color: COLORS.textLight
            }]}>{r.range}</Text>
                <Text style={[styles.td, {
              flex: 1,
              color,
              fontWeight: '700'
            }]}>{STATUS_LABEL[r.status] || r.status}</Text>
              </View>;
        })}
        </View>

        {!!report.remarks && <>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <View style={styles.remarksCard}><Text style={styles.remarksText}>{report.remarks}</Text></View>
          </>}
      </ScrollView>

      {/* Download bar */}
      <View style={[styles.bar, {
      paddingBottom: bottomInset + 12,
      flexDirection: 'row',
      gap: 10
    }]}>
        {!!report.pdfData && <TouchableOpacity style={[styles.dlBtn, { flex: 1 }]} onPress={openUploadedPdf} disabled={downloading} activeOpacity={0.9}>
          {downloading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="document-text" size={18} color="#FFF" /><Text style={styles.dlText}>Open PDF</Text></>}
        </TouchableOpacity>}
        {(analysis.results && analysis.results.length > 0) && <TouchableOpacity style={[styles.dlBtn, { flex: 1 }]} onPress={download} disabled={downloading} activeOpacity={0.9}>
          {downloading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="download" size={18} color="#FFF" /><Text style={styles.dlText}>Download PDF</Text></>}
        </TouchableOpacity>}
      </View>

      <ThemedPrompt {...prompt} />
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  muted: {
    color: COLORS.textLight
  },
  headCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center'
  },
  headIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  headTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center'
  },
  headMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4
  },
  overallPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 12
  },
  overallText: {
    fontSize: 12,
    fontWeight: '800'
  },
  pdfNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.mintLight || (COLORS.primary + '12'),
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  pdfNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8
  },
  summary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 12
  },
  suggestion: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 10
  },
  suggestionParam: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2
  },
  suggestionText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  table: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  trow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: 'center'
  },
  thead: {
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border
  },
  th: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  td: {
    fontSize: 12.5,
    color: COLORS.text
  },
  remarksCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14
  },
  remarksText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19
  },
  bar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  dlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15
  },
  dlText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800'
  }
});