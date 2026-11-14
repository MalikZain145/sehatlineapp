import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import laboratoryService from "../../services/laboratoryService";
import { labAlert } from "../../components/common/LabAlert";

import {
  generateLaboratoryReport,
  shareLaboratoryReport,
} from "../../services/pdfService";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';

export default function CompletedReportsScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const { completedReports, refreshCompleted, refreshQueue } = useLaboratory();

  const [loadingId, setLoadingId] = useState(null);

  // ── Bulk PDF upload: pick N PDFs → send one per waiting patient, advancing a
  // progress bar as each report is confirmed saved to the patient's My Reports.
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);      // 0..1
  const [progressText, setProgressText] = useState("");

  // Read the card number from a PDF's file name (the token that carries digits,
  // e.g. "CDA-12345 CBC.pdf" → "CDA-12345"; "C-1.pdf" → "C-1").
  const cardFromName = (name) => {
    const base = String(name || "").replace(/\.pdf$/i, "").trim();
    const tokens = base.split(/[\s_]+/).filter(Boolean);
    const withDigit = tokens.find((t) => /\d/.test(t));
    return (withDigit || base).trim();
  };

  const handleUpload = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const pdfs = picked.assets || [];
      if (!pdfs.length) return;

      const total = pdfs.length;
      setUploading(true);
      setProgress(0);
      setProgressText(`Starting… 0 / ${total}`);

      let sent = 0;
      const invalid = [];
      for (let i = 0; i < total; i++) {
        const pdf = pdfs[i];
        const cardNo = cardFromName(pdf.name);
        const title = (pdf.name || "Lab Report").replace(/\.pdf$/i, "");
        try {
          let pdfData = "";
          try { pdfData = await FileSystem.readAsStringAsync(pdf.uri, { encoding: "base64" }); } catch (e) { /* attach name only */ }
          // Card number → patient. No queue needed; the report lands in their
          // My Reports and they're notified. Invalid card → counted as invalid.
          await laboratoryService.uploadReport({ cardNo, title, pdfName: pdf.name || `${title}.pdf`, pdfData });
          sent += 1;
        } catch (e) {
          invalid.push(pdf.name || cardNo || "report");
        }
        // Progress reflects PDFs processed (each confirmed by the backend).
        setProgress((i + 1) / total);
        setProgressText(`${i + 1} / ${total} processed  ·  ${sent} sent`);
      }

      try { await refreshCompleted?.(); } catch (e) {}

      setProgress(1);
      setProgressText(`Completed — ${sent} / ${total} sent`);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setProgressText("");
        const msg = invalid.length
          ? `${sent} report${sent === 1 ? "" : "s"} sent to patients.\n\n${invalid.length} invalid (card number not found): ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}`
          : `${sent} report${sent === 1 ? "" : "s"} sent to ${sent === 1 ? "the patient" : "patients"}. They can now view it in My Reports.`;
        labAlert(invalid.length ? "Upload Finished" : "Upload Complete", msg);
      }, 600);
    } catch (e) {
      setUploading(false);
      labAlert("Upload Failed", e?.message || "Could not upload the reports.");
    }
  };

  const openPDF = async (patient) => {
    try {
      setLoadingId(patient.id);

      const uri = await generateLaboratoryReport(
        patient
      );

      await shareLaboratoryReport(uri);
    } catch (error) {
      console.log(
        "PDF generation error:",
        error
      );
    } finally {
      setLoadingId(null);
    }
  };

  const renderReport = ({ item }) => {
    return (
      <View
        style={[
          styles.reportCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* PDF ICON */}

        <View
          style={[
            styles.pdfIcon,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Ionicons
            name="document-text"
            size={28}
            color={colors.primary}
          />
        </View>

        {/* REPORT INFORMATION */}

        <View style={styles.reportInfo}>
          <Text
            style={[
              styles.patientName,
              {
                color: colors.text,
              },
            ]}
          >
            {item.patientName}
          </Text>

          <Text
            style={[
              styles.cardNumber,
              {
                color: colors.primary,
              },
            ]}
          >
            Card No: {item.cardNo}
          </Text>

          <Text
            style={[
              styles.testName,
              {
                color: colors.text,
              },
            ]}
          >
            {item.testName}
          </Text>

          <View style={styles.details}>
            <View style={styles.detail}>
              <Ionicons
                name="person-outline"
                size={13}
                color={colors.textSecondary}
              />

              <Text
                style={[
                  styles.detailText,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {item.doctorName}
              </Text>
            </View>

            <View style={styles.detail}>
              <Ionicons
                name="time-outline"
                size={13}
                color={colors.textSecondary}
              />

              <Text
                style={[
                  styles.detailText,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {item.completedAt}
              </Text>
            </View>
          </View>

          {/* COMPLETED STATUS */}

          <View
            style={[
              styles.status,
              {
                backgroundColor:
                  colors.mint,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={colors.success}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: colors.darkTeal,
                },
              ]}
            >
              Report Completed
            </Text>
          </View>

          {/* PDF BUTTON */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openPDF(item)}
            disabled={loadingId === item.id}
            style={[
              styles.pdfButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            {loadingId === item.id ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <>
                <Ionicons
                  name="document-text-outline"
                  size={17}
                  color={colors.white}
                />

                <Text
                  style={[
                    styles.pdfButtonText,
                    {
                      color: colors.white,
                    },
                  ]}
                >
                  View PDF Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      
{/* HEADER */}

<GradientHeader title="Reports" subtitle="Laboratory reports and results" />

{/* Upload reports → pick one or more PDFs; each is sent to a waiting patient
    and appears in their My Reports. Progress advances as the backend confirms
    each one. */}
{uploading ? (
  <View style={{ marginHorizontal: 18, marginTop: 16, marginBottom: 4, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Uploading reports…</Text>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900" }}>{Math.round(progress * 100)}%</Text>
    </View>
    <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.mint, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(progress * 100)}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 5 }} />
    </View>
    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{progressText}</Text>
  </View>
) : (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={handleUpload}
    style={{
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      marginHorizontal: 18, marginTop: 16, marginBottom: 4, paddingVertical: 15,
      borderRadius: 14, backgroundColor: colors.primary,
    }}
  >
    <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
    <Text style={{ color: colors.white, fontSize: 15, fontWeight: "800" }}>Upload a Report</Text>
  </TouchableOpacity>
)}

<FlatList
  data={completedReports}
  keyExtractor={(item) => item.id}
  renderItem={renderReport}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={
    completedReports.length === 0
      ? styles.emptyList
      : styles.list
  }
  ListEmptyComponent={
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name="documents-outline"
          size={45}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          {
            color: colors.text,
          },
        ]}
      >
        No Completed Reports
      </Text>

      <Text
        style={[
          styles.emptyText,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        Completed laboratory reports will appear here.
      </Text>
    </View>
    }
    />
        </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: topPad(55),
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
  },

  subtitle: {
    fontSize: 12,
    marginTop: 5,
  },

  countBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginLeft: "auto",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 16,
    fontWeight: "800",
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  reportCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    marginBottom: 14,
    flexDirection: "row",
    elevation: 2,
  },

  header: {
  height: topPad(100),
  paddingHorizontal: 18,
  paddingTop: topPad(35),
  flexDirection: "row",
  alignItems: "center",
},

headerButton: {
  width: 42,
  height: 42,
  justifyContent: "center",
  alignItems: "center",
},

headerTextContainer: {
  flex: 1,
  marginLeft: 8,
},

headerTitle: {
  color: "#FFFFFF",
  fontSize: 21,
  fontWeight: "800",
},

headerSubtitle: {
  color: "#E6FFFB",
  fontSize: 12,
  fontWeight: "600",
  marginTop: 3,
},

headerSpacer: {
  width: 42,
},

  pdfIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  reportInfo: {
    flex: 1,
    marginLeft: 13,
  },

  patientName: {
    fontSize: 16,
    fontWeight: "800",
  },

  cardNumber: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  testName: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },

  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 7,
  },

  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  detailText: {
    fontSize: 10,
  },

  status: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 9,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  pdfButton: {
    height: 40,
    borderRadius: 11,
    marginTop: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  pdfButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 35,
  },

  emptyIcon: {
    width: 85,
    height: 85,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
  },

  emptyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});