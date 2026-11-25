import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function TestDetailsScreen({ route, navigation }) {
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
            styles.backAction,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Text
            style={{
              color: colors.white,
              fontWeight: "700",
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const markCompleted = () => {
    completePatient(patient.id);

    labAlert(
      "Report Completed",
      `${patient.patientName}'s laboratory report has been completed.`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const statusColor = {
    Waiting: colors.warning,
    "Sample Collected": colors.blue,
    Processing: colors.purple,
    Completed: colors.success,
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

        <GradientHeader title="Test Details" />

        {/* PATIENT CARD */}

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
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  (statusColor[patient.status] ||
                    colors.primary) + "20",
              },
            ]}
          >
            <Text
              style={{
                color:
                  statusColor[patient.status] ||
                  colors.primary,
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {patient.status}
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
        </View>

        {/* UPLOAD LABORATORY REPORT */}

<TouchableOpacity
  activeOpacity={0.8}
  onPress={() => {
    navigation.navigate("UploadReport", {
      patientId: patient.id,
    });
  }}
  style={[
    styles.uploadButton,
    {
      backgroundColor: colors.primary,
    },
  ]}
>
  <Ionicons
    name="cloud-upload-outline"
    size={19}
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
    Upload Laboratory Report
  </Text>
</TouchableOpacity>

        {/* MARK COMPLETED */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={markCompleted}
          style={[
            styles.completeButton,
            {
              backgroundColor: colors.success,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.white}
          />

          <Text
            style={[
              styles.completeText,
              {
                color: colors.white,
              },
            ]}
          >
            Mark Report Completed
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ================= INFO ROW ================= */

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

/* ================= STYLES ================= */

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

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
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
  uploadButton: {
  height: 52,
  marginHorizontal: 18,
  marginTop: 20,
  borderRadius: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

uploadButtonText: {
  fontSize: 14,
  fontWeight: "800",
},

  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  completeButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  completeText: {
    fontSize: 14,
    fontWeight: "800",
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

  backAction: {
    marginTop: 18,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
});