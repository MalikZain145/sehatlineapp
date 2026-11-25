import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function UploadReportScreen({
  route,
  navigation,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

 const {
  queuePatients,
  completePatient,
} = useLaboratory();

  const patientId = route?.params?.patientId;

  const patient = queuePatients.find(
    (item) => item.id === patientId
  );

 

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);


  /* ==============================
     PATIENT NOT FOUND
  ============================== */

  if (!patient) {
    return (
      <View
        style={[
          styles.errorContainer,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={55}
          color={colors.error}
        />

        <Text
          style={[
            styles.errorTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Patient Not Found
        </Text>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color: colors.white,
              },
            ]}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ==============================
     PICK REPORT
  ============================== */

 const pickReport = async () => {
  try {
    const result =
      await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

    if (result.canceled) {
      return;
    }

    const file = result.assets?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
  } catch (error) {
    console.log(
      "Document picker error:",
      error
    );

    labAlert(
      "Error",
      "Unable to select the PDF report."
    );
  }
};
  /* ==============================
     REMOVE REPORT
  ============================== */

  const removeReport = () => {
    labAlert(
      "Remove Report",
      "Are you sure you want to remove this file?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSelectedFile(null);
          },
        },
      ]
    );
  };

  /* ==============================
     UPLOAD REPORT
  ============================== */
const uploadReport = async () => {
  if (!selectedFile) {
    labAlert(
      "Report Required",
      "Please select a laboratory report first."
    );

    return;
  }

  try {
    setUploading(true);

    // BUG FIX: this used to WAIT 1 s and show "ready to be uploaded to the
    // backend" — the PDF was never sent; the patient only got an empty
    // report record. Now the real PDF (base64) is attached to the patient's
    // lab report and appears in their "My Reports".
    let pdfData = "";
    try {
      pdfData = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: "base64" });
    } catch (e) {
      labAlert("Upload Failed", "Could not read the selected PDF. Please pick it again.");
      return;
    }
    // Phone storage can't safely hold very large files for offline sync, so
    // big PDFs need a live connection.
    const big = pdfData.length > 1500000;
    const res = await completePatient(
      patient.id,
      {
        title: patient.testName || (selectedFile.name || "Lab Report").replace(/\.pdf$/i, ""),
        pdfName: selectedFile.name || "report.pdf",
        pdfData,
      },
      { noQueue: big, label: `lab report for ${patient.name || "patient"}` }
    );
    labAlert(
      res?.queued ? "Saved Offline" : "Report Uploaded",
      res?.queued
        ? "You're offline. The report is saved and will be sent to the patient automatically when the connection returns."
        : "The report has been sent to the patient. They can now view it in My Reports.",
      [
        {
          text: "OK",
          onPress: () => navigation.navigate("Queue"),
        },
      ]
    );
  } catch (error) {
    console.log("Upload error:", error);

    labAlert(
      "Upload Failed",
      error?.code === "NETWORK" || error?.code === "TIMEOUT"
        ? "No connection, and this PDF is too large to save offline. Please try again when you're online."
        : error?.message || "Unable to upload the report."
    );
  } finally {
    setUploading(false);
  }
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <GradientHeader title="Upload Report" />

        {/* PATIENT INFORMATION */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Patient Information
        </Text>

        <View
          style={[
            styles.patientCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.patientIcon,
              {
                backgroundColor: colors.mint,
              },
            ]}
          >
            <Ionicons
              name="person"
              size={25}
              color={colors.primary}
            />
          </View>

          <View style={styles.patientInfo}>
            <Text
              style={[
                styles.patientName,
                {
                  color: colors.text,
                },
              ]}
            >
              {patient.patientName}
            </Text>

            <Text
              style={[
                styles.cardNumber,
                {
                  color: colors.primary,
                },
              ]}
            >
              Card No: {patient.cardNo}
            </Text>

            <Text
              style={[
                styles.testName,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {patient.testName}
            </Text>
          </View>
        </View>

        {/* TEST INFORMATION */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Test Information
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <InfoRow
            icon="flask-outline"
            label="Test"
            value={patient.testName}
            colors={colors}
          />

          <InfoRow
            icon="person-outline"
            label="Doctor"
            value={patient.doctorName}
            colors={colors}
          />

          <InfoRow
            icon="time-outline"
            label="Requested"
            value={patient.time}
            colors={colors}
          />

          <InfoRow
            icon="pulse-outline"
            label="Status"
            value={patient.status}
            colors={colors}
          />
        </View>

        {/* LABORATORY REPORT */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Laboratory Report
        </Text>

        {!selectedFile ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={pickReport}
            style={[
              styles.uploadBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              },
            ]}
          >
            <View
              style={[
                styles.uploadIcon,
                {
                  backgroundColor: colors.mint,
                },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={35}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.uploadTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Upload Laboratory Report
            </Text>

            <Text
              style={[
                styles.uploadSubtitle,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Select a PDF or image report
            </Text>

            <View
              style={[
                styles.chooseButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name="folder-open-outline"
                size={17}
                color={colors.white}
              />

              <Text
                style={[
                  styles.chooseButtonText,
                  {
                    color: colors.white,
                  },
                ]}
              >
                Choose File
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.fileCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.fileIcon,
                {
                  backgroundColor: colors.mint,
                },
              ]}
            >
              <Ionicons
                name={
                  selectedFile.mimeType ===
                  "application/pdf"
                    ? "document-text"
                    : "image"
                }
                size={28}
                color={colors.primary}
              />
            </View>

            <View style={styles.fileInfo}>
              <Text
                numberOfLines={2}
                style={[
                  styles.fileName,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {selectedFile.name}
              </Text>

              <Text
                style={[
                  styles.fileSize,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {selectedFile.size
                  ? `${(
                      selectedFile.size /
                      1024 /
                      1024
                    ).toFixed(2)} MB`
                  : "File selected"}
              </Text>

              <View style={styles.fileStatus}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.success}
                />

                <Text
                  style={[
                    styles.fileStatusText,
                    {
                      color: colors.success,
                    },
                  ]}
                >
                  File Selected
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={removeReport}
              style={styles.removeButton}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* UPLOAD BUTTON */}

        {selectedFile && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={uploadReport}
            disabled={uploading}
            style={[
              styles.uploadButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color={colors.white}
              />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={colors.white}
                />

                <Text
                  style={[
                    styles.uploadButtonText,
                    {
                      color: colors.white,
                    },
                  ]}
                >
                  Upload Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* INFORMATION */}

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />

          <Text
            style={[
              styles.infoBoxText,
              {
                color: colors.darkTeal,
              },
            ]}
          >
            Upload the patient's completed
            laboratory report. The report will
            later be stored and linked to this
            patient's record through the backend.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ==============================
   INFO ROW
============================== */

function InfoRow({
  icon,
  label,
  value,
  colors,
}) {
  return (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={colors.primary}
        />
      </View>

      <View style={styles.infoText}>
        <Text
          style={[
            styles.infoLabel,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            {
              color: colors.text,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ==============================
   STYLES
============================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    height: topPad(105),
    paddingTop: topPad(45),
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 42,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },

  patientCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  patientIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },

  patientName: {
    fontSize: 17,
    fontWeight: "800",
  },

  cardNumber: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  testName: {
    fontSize: 11,
    marginTop: 4,
  },

  infoCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    flex: 1,
    marginLeft: 12,
  },

  infoLabel: {
    fontSize: 10,
  },

  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  uploadBox: {
    marginHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  uploadIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 14,
  },

  uploadSubtitle: {
    fontSize: 11,
    marginTop: 5,
  },

  chooseButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  chooseButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },

  fileCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  fileIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  fileName: {
    fontSize: 13,
    fontWeight: "800",
  },

  fileSize: {
    fontSize: 10,
    marginTop: 4,
  },

  fileStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  fileStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  removeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  uploadButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  infoBox: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  infoBoxText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },

  backButton: {
    marginTop: 18,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});