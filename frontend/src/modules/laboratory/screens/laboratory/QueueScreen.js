import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';

export default function QueueScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

const {
  queuePatients,
  updatePatientStatus,
  completePatient,
} = useLaboratory();

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState("All");

  const filters = [
    { label: "All", value: "All" },
    { label: "Waiting", value: "Waiting" },
    { label: "Collected", value: "Sample Collected" },
    { label: "Processing", value: "Processing" },
    { label: "Done", value: "Completed" },
  ];

  /* ================= COUNTS ================= */

  const waitingCount = queuePatients.filter(
    (patient) => patient.status === "Waiting"
  ).length;

  const sampleCount = queuePatients.filter(
    (patient) => patient.status === "Sample Collected"
  ).length;

  const processingCount = queuePatients.filter(
    (patient) => patient.status === "Processing"
  ).length;

  const completedCount = queuePatients.filter(
    (patient) => patient.status === "Completed"
  ).length;

  /* ================= FILTER ================= */

  const filteredPatients = useMemo(() => {
    return queuePatients.filter((patient) => {
      const matchesSearch =
        patient.patientName
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        patient.cardNo
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        patient.testName
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        selectedFilter === "All" ||
        patient.status === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [queuePatients, search, selectedFilter]);

  /* ================= UPDATE STATUS ================= */



  /* ================= STATUS COLOR ================= */

  const getStatusColor = (status) => {
    switch (status) {
      case "Waiting":
        return colors.warning;

      case "Sample Collected":
        return colors.blue;

      case "Processing":
        return colors.purple;

      case "Completed":
        return colors.success;

      default:
        return colors.textSecondary;
    }
  };

  /* ================= STATUS ICON ================= */

  const getStatusIcon = (status) => {
    switch (status) {
      case "Waiting":
        return "time-outline";

      case "Sample Collected":
        return "flask-outline";

      case "Processing":
        return "sync-outline";

      case "Completed":
        return "checkmark-circle-outline";

      default:
        return "ellipse-outline";
    }
  };

  /* ================= PATIENT CARD ================= */

 const renderPatient = ({ item, index }) => {
  const statusColor = getStatusColor(item.status);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        navigation.navigate("TestDetails", {
          patientId: item.id,
        });
      }}
      style={[
        styles.patientCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Queue Number */}

      <View
        style={[
          styles.queueNumber,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Text
          style={[
            styles.queueNumberText,
            {
              color: colors.primary,
            },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      {/* Patient Information */}

      <View style={styles.patientInfo}>
        <View style={styles.nameRow}>
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

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor + "20",
              },
            ]}
          >
            <Ionicons
              name={getStatusIcon(item.status)}
              size={12}
              color={statusColor}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.cardNo,
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

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons
              name="person-outline"
              size={14}
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

          <View style={styles.detailItem}>
            <Ionicons
              name="time-outline"
              size={14}
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
              {item.time}
            </Text>
          </View>
        </View>

        {/* ACTIONS */}

        {item.status === "Waiting" && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              updatePatientStatus(
                item.id,
                "Sample Collected"
              )
            }
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="flask-outline"
              size={17}
              color={colors.white}
            />

            <Text
              style={[
                styles.actionButtonText,
                {
                  color: colors.white,
                },
              ]}
            >
              Collect Sample
            </Text>
          </TouchableOpacity>
        )}

        {item.status === "Sample Collected" && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              updatePatientStatus(
                item.id,
                "Processing"
              )
            }
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="play-circle-outline"
              size={17}
              color={colors.white}
            />

            <Text
              style={[
                styles.actionButtonText,
                {
                  color: colors.white,
                },
              ]}
            >
              Start Processing
            </Text>
          </TouchableOpacity>
        )}

        {item.status === "Processing" && (
          // Non-clickable — the test auto-completes when the report is uploaded
          // (the technician no longer marks it complete manually).
          <View
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={17}
              color={colors.textSecondary}
            />

            <Text
              style={[
                styles.actionButtonText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Waiting for report to be uploaded
            </Text>
          </View>
        )}

        {item.status === "Completed" && (
          <View>
            {/* Completed patient actions can go here later */}
          </View>
        )}
      </View>
    </TouchableOpacity>
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

      {/* HEADER */}

<GradientHeader title="Today's Queue" subtitle="Patients and laboratory tests" />

      {/* SEARCH */}

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            marginTop: 14,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textSecondary}
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search patient, card or test..."
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.searchInput,
            {
              color: colors.text,
            },
          ]}
        />
      </View>

      {/* FILTERS — horizontal strip of small chips */}

      <View style={styles.filterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {filters.map((item) => {
            const active = selectedFilter === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.8}
                onPress={() => setSelectedFilter(item.value)}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.filterText,
                    { color: active ? colors.white : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* QUEUE */}

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={renderPatient}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.queueList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={55}
              color={colors.textSecondary}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              No patients found
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              There are no patients matching
              your search or filter.
            </Text>
          </View>
        }
      />
    </View>
  );
}

/* ================= SUMMARY CARD ================= */

function SummaryCard({
  number,
  label,
  icon,
  color,
  colors,
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={color}
      />

      <Text
        style={[
          styles.summaryNumber,
          {
            color: colors.text,
          },
        ]}
      >
        {number}
      </Text>

      <Text
        style={[
          styles.summaryLabel,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 7,
    marginBottom: 14,
  },

  summaryCard: {
    flex: 1,
    minHeight: 88,
    borderRadius: 15,
    borderWidth: 1,
    padding: 10,
    justifyContent: "center",
  },

  summaryNumber: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: 3,
  },

  summaryLabel: {
    fontSize: 10,
    marginTop: 1,
  },

  searchContainer: {
    height: 48,
    marginHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
  },

  filterStrip: {
    paddingVertical: 10,
  },

  filterList: {
    paddingHorizontal: 18,
    gap: 8,
    alignItems: "center",
  },

  filterButton: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  filterText: {
    fontSize: 12.5,
    fontWeight: "700",
  },

  queueList: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  patientCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 13,
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

  queueNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  queueNumberText: {
    fontSize: 15,
    fontWeight: "800",
  },

  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  patientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    marginRight: 7,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },

  cardNo: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },

  testName: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },

  detailsRow: {
    flexDirection: "row",
    gap: 15,
    marginTop: 7,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  detailText: {
    fontSize: 10,
  },

  actionButton: {
    height: 40,
    borderRadius: 11,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  completedMessage: {
    height: 38,
    borderRadius: 11,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  completedText: {
    fontSize: 12,
    fontWeight: "700",
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },

  emptyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});