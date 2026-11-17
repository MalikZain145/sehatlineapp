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

{/* Bulk PDF upload removed — reports are uploaded per patient from the
    Queue → Upload Report screen. */}

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