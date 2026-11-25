import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function AnalyticsScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const { queuePatients = [], completedReports = [] } = useLaboratory();

  // Real backend numbers (dashboard + analytics endpoints).
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const load = useCallback(async () => {
    try { const d = await laboratoryService.getDashboard(); setStats(d?.stats || null); } catch (e) { /* offline */ }
    try { const a = await laboratoryService.getAnalytics(); setAnalytics(a || null); } catch (e) { /* offline */ }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const reportsToday = analytics?.overview?.reportsToday ?? 0;
  const totalReports = analytics?.overview?.totalReports ?? (Array.isArray(completedReports) ? completedReports.length : 0);
  const sumQueue = (stats?.waiting || 0) + (stats?.collected || 0) + (stats?.processing || 0);
  const inQueue = stats?.inQueue ?? (sumQueue || (Array.isArray(queuePatients) ? queuePatients.length : 0));

  // "Today's Overview" — today's completed reports vs what's still in the queue.
  const completedCount = reportsToday;
  const pendingCount = inQueue;
  const totalTests = completedCount + pendingCount;
  const completionRate = totalTests > 0 ? Math.round((completedCount / totalTests) * 100) : 0;
  const processingCount = stats?.processing ?? 0;
  const efficiency = completionRate;
  let efficiencyStatus = "Needs Attention";
  if (efficiency >= 80) efficiencyStatus = "Excellent";
  else if (efficiency >= 60) efficiencyStatus = "Good";
  else if (efficiency >= 40) efficiencyStatus = "Average";

  // Real test-category distribution from the catalog (analytics endpoint).
  const CAT_ICON = {
    Hematology: "water-outline", Biochemistry: "flask-outline",
    "Clinical Pathology": "fitness-outline", Endocrinology: "pulse-outline",
    Immunology: "shield-outline", Microbiology: "bug-outline",
  };
  const testTypes = (analytics?.categories || []).slice(0, 6).map((c) => ({
    name: c.name, icon: CAT_ICON[c.name] || "flask-outline", count: c.count,
  }));

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
        {/* Header */}

       {/* HEADER */}

<GradientHeader title="Analytics" subtitle="Laboratory performance overview" />

        {/* Overview */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Today's Overview
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="flask-outline"
            title="Total Tests"
            value={totalTests}
            iconColor={colors.primary}
            colors={colors}
          />

          <StatCard
            icon="checkmark-circle-outline"
            title="Completed"
            value={completedCount}
            iconColor={colors.success}
            colors={colors}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="time-outline"
            title="Pending"
            value={pendingCount}
            iconColor={colors.warning}
            colors={colors}
          />

          <StatCard
            icon="trending-up-outline"
            title="Completion"
            value={`${completionRate}%`}
            iconColor={colors.blue}
            colors={colors}
          />
        </View>

        {/* Completion Card */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Test Completion
        </Text>

        <View
          style={[
            styles.completionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.completionHeader}>
            <View>
              <Text
                style={[
                  styles.completionTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Today's Progress
              </Text>

              <Text
                style={[
                  styles.completionSubtitle,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {completedCount} of {totalTests} tests completed
              </Text>
            </View>

            <Text
              style={[
                styles.percentage,
                {
                  color: colors.primary,
                },
              ]}
            >
              {completionRate}%
            </Text>
          </View>

          <View
            style={[
              styles.progressBackground,
              {
                backgroundColor: colors.mint,
              },
            ]}
          >
            <View
              style={[
                styles.progress,
                {
                  width: `${completionRate}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>

    
                {/* CATEGORY DISTRIBUTION  */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Test Category Distribution
        </Text>

        <View
          style={[
            styles.distributionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {testTypes.map((item) => {
            const percentage =
              totalTests > 0
                ? Math.round(
                    (item.count / totalTests) * 100
                  )
                : 0;

            return (
              <View
                key={item.name}
                style={styles.distributionItem}
              >
                {/* TOP ROW */}

                <View style={styles.distributionHeader}>
                  <Text
                    style={[
                      styles.distributionName,
                      {
                        color: colors.text,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={[
                      styles.distributionCount,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    {item.count}{" "}
                    {item.count === 1
                      ? "Test"
                      : "Tests"}
                  </Text>
                </View>

                {/* PROGRESS */}

                <View
                  style={[
                    styles.distributionBackground,
                    {
                      backgroundColor:
                        colors.mint,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.distributionProgress,
                      {
                        width: `${percentage}%`,
                        backgroundColor:
                          colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* PERCENTAGE */}

                <Text
                  style={[
                    styles.distributionPercentage,
                    {
                      color: colors.primary,
                    },
                  ]}
                >
                  {percentage}%
                </Text>
              </View>
            );
          })}
        </View>

        

        {/* Performance */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Performance
        </Text>

        <View
          style={[
            styles.performanceCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <PerformanceRow
  icon="speedometer-outline"
  title="Processing Efficiency"
  value={efficiencyStatus}
  color={
    efficiency >= 60
      ? colors.success
      : colors.warning
  }
  colors={colors}
/>

<PerformanceRow
  icon="people-outline"
  title="Patient Queue"
  value={`${pendingCount} Pending`}
  color={colors.warning}
  colors={colors}
/>

<PerformanceRow
  icon="sync-outline"
  title="Currently Processing"
  value={processingCount}
  color={colors.blue}
  colors={colors}
/>

<PerformanceRow
  icon="document-text-outline"
  title="Reports Generated"
  value={completedCount}
  color={colors.primary}
  colors={colors}
/>
        </View>

      </ScrollView>
    </View>
  );
}

/* ================= STAT CARD ================= */

function StatCard({
  icon,
  title,
  value,
  iconColor,
  colors,
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.statValue,
          {
            color: colors.text,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statTitle,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

/* ================= PERFORMANCE ROW ================= */

function PerformanceRow({
  icon,
  title,
  value,
  color,
  colors,
}) {
  return (
    <View style={styles.performanceRow}>
      <View
        style={[
          styles.performanceIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.performanceTitle,
          {
            color: colors.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.performanceValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },

  content: {
    paddingBottom: 35,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 12,
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    minHeight: 125,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    elevation: 2,
  },

  statIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  statValue: {
    fontSize: 25,
    fontWeight: "800",
    marginTop: 9,
  },

  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },

  completionCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 2,
  },

  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  completionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  completionSubtitle: {
    fontSize: 12,
    marginTop: 5,
  },

  percentage: {
    fontSize: 25,
    fontWeight: "800",
  },

  progressBackground: {
    height: 10,
    borderRadius: 5,
    marginTop: 18,
    overflow: "hidden",
  },

  progress: {
    height: "100%",
    borderRadius: 5,
  },

  categoryCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    elevation: 2,
  },

  categoryRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  categoryIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryInfo: {
    flex: 1,
    marginLeft: 13,
  },

  categoryName: {
    fontSize: 14,
    fontWeight: "700",
  },

  categorySubtext: {
    fontSize: 11,
    marginTop: 3,
  },

  categoryCount: {
    fontSize: 20,
    fontWeight: "800",
  },

  performanceCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    elevation: 2,
  },

  performanceRow: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
  },

  performanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  performanceTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 13,
  },

  performanceValue: {
    fontSize: 13,
    fontWeight: "800",
  },

  distributionCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 2,
  },

  distributionItem: {
    marginBottom: 18,
  },

  distributionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  distributionName: {
    fontSize: 14,
    fontWeight: "700",
  },

  distributionCount: {
    fontSize: 12,
    fontWeight: "600",
  },

  distributionBackground: {
    height: 9,
    borderRadius: 5,
    overflow: "hidden",
  },

  distributionProgress: {
    height: "100%",
    borderRadius: 5,
  },

  distributionPercentage: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "right",
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
});