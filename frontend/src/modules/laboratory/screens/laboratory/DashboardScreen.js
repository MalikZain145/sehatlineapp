import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import SideMenu from "../../components/common/SideMenu";
import laboratoryService from "../../services/laboratoryService";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';


export default function DashboardScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { queuePatients = [] } = useLaboratory();

  const colors = theme.colors;
  const [menuVisible, setMenuVisible] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await laboratoryService.getNotifications();
      setUnread((res?.notifications || []).filter((x) => !x.read).length);
    } catch (e) { /* offline */ }
  }, []);

  useEffect(() => {
    loadUnread();
    const unsub = navigation.addListener("focus", loadUnread);
    return unsub;
  }, [loadUnread, navigation]);

  /* ================= COUNTS ================= */

  const waitingCount = queuePatients.filter(
    (patient) => patient.status === "Waiting"
  ).length;

  const sampleCollectedCount = queuePatients.filter(
    (patient) => patient.status === "Sample Collected"
  ).length;

  const processingCount = queuePatients.filter(
    (patient) => patient.status === "Processing"
  ).length;

  const completedCount = queuePatients.filter(
    (patient) => patient.status === "Completed"
  ).length;



  const testsToday = queuePatients.length;

  return (
    <SafeAreaView
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

        {/* ================= TOP BAR ================= */}

    
<View style={styles.appHeader}>
  {/* Top row: menu (left) + bell (right) — plain teal icons, no box */}
  <View style={styles.appHeaderTopBar}>
    <TouchableOpacity activeOpacity={0.7} onPress={() => setMenuVisible(true)}>
      <Ionicons name="menu" size={30} color={colors.primary} />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.bellBtn}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("Notifications")}
    >
      <Ionicons name="notifications-outline" size={26} color={colors.primary} />
      {unread > 0 && (
        <View style={[styles.bellDot, { borderColor: colors.background }]}>
          <Text style={styles.bellCount}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>

  {/* Centered logo + title */}
  <View style={styles.appHeaderContent}>
    <View style={[styles.logoCircle, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
      <Image
        source={theme.dark
          ? require("../../assets/images/logoo-dark.png")
          : require("../../assets/images/logoo.png")}
        style={styles.appLogo}
        resizeMode="contain"
      />
    </View>

    <Text style={[styles.appHeaderTitle, { color: colors.text }]}>SEHATLINE</Text>
    <Text style={[styles.appHeaderSubtitle, { color: colors.textSecondary }]}>
      CDA Hospital Laboratory
    </Text>
  </View>
</View>

        {/* ================= TODAY'S OVERVIEW ================= */}
          

       {/* ================= TODAY'S OVERVIEW ================= */}

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

<View style={styles.grid}>

  {/* Tests Today */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="people-outline"
        size={28}
        color={colors.primary}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {testsToday}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Tests Today
    </Text>
  </View>


  {/* Samples Collected */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="flask-outline"
        size={28}
        color={colors.success}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {sampleCollectedCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Samples Collected
    </Text>
  </View>


  {/* Waiting */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="time-outline"
        size={28}
        color={colors.warning}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {waitingCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Waiting
    </Text>
  </View>


  {/* Completed */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="checkmark-circle-outline"
        size={28}
        color={colors.success}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {completedCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Completed
    </Text>
  </View>

</View>


{/* ================= SAMPLE STATUS ================= */}

<Text
  style={[
    styles.sectionTitle,
    {
      color: colors.text,
    },
  ]}
>
  Sample Status
</Text>

<View style={styles.grid}>

  {/* Samples Waiting */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="water-outline"
        size={28}
        color={colors.warning}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {waitingCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Samples Waiting
    </Text>
  </View>


  {/* Collected */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="flask-outline"
        size={28}
        color={colors.primary}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {sampleCollectedCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Collected
    </Text>
  </View>


  {/* Processing */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="sync-outline"
        size={28}
        color={colors.blue}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {processingCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Processing
    </Text>
  </View>


  {/* Reports Ready */}
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
        styles.iconCircle,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="document-text-outline"
        size={28}
        color={colors.success}
      />
    </View>

    <Text
      style={[
        styles.statCount,
        {
          color: colors.text,
        },
      ]}
    >
      {completedCount}
    </Text>

    <Text
      style={[
        styles.statTitle,
        {
          color: colors.textSecondary,
        },
      ]}
    >
      Reports Ready
    </Text>
  </View>

</View>

        {/* ================= QUICK ACTIONS ================= */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>

          <View style={styles.quickActionsContainer}>

  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => navigation.navigate("Queue")}
    style={[
      styles.quickActionCard,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
    ]}
  >
    <View
      style={[
        styles.quickActionIcon,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="people-outline"
        size={23}
        color={colors.primary}
      />
    </View>

    <View>
      <Text
        style={[
          styles.quickActionTitle,
          {
            color: colors.text,
          },
        ]}
      >
        Patient Queue
      </Text>

      <Text
        style={[
          styles.quickActionSubtitle,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        Process today's patients
      </Text>
    </View>
  </TouchableOpacity>


  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => navigation.navigate("TestCatalog")}
    style={[
      styles.quickActionCard,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
    ]}
  >
    <View
      style={[
        styles.quickActionIcon,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="flask-outline"
        size={23}
        color={colors.primary}
      />
    </View>

    <View>
      <Text
        style={[
          styles.quickActionTitle,
          {
            color: colors.text,
          },
        ]}
      >
        Test Catalog
      </Text>

      <Text
        style={[
          styles.quickActionSubtitle,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        View available tests
      </Text>
    </View>
  </TouchableOpacity>


  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => navigation.navigate("CompletedReports")}
    style={[
      styles.quickActionCard,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
    ]}
  >
    <View
      style={[
        styles.quickActionIcon,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="document-text-outline"
        size={23}
        color={colors.primary}
      />
    </View>

    <View>
      <Text
        style={[
          styles.quickActionTitle,
          {
            color: colors.text,
          },
        ]}
      >
        Completed Reports
      </Text>

      <Text
        style={[
          styles.quickActionSubtitle,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        View completed reports
      </Text>
    </View>
  </TouchableOpacity>


  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => navigation.navigate("Requisitions")}
    style={[
      styles.quickActionCard,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
    ]}
  >
    <View
      style={[
        styles.quickActionIcon,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="cube-outline"
        size={23}
        color={colors.primary}
      />
    </View>

    <View>
      <Text
        style={[
          styles.quickActionTitle,
          {
            color: colors.text,
          },
        ]}
      >
        Inventory & Requisitions
      </Text>

      <Text
        style={[
          styles.quickActionSubtitle,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        Manage stock and requests
      </Text>
    </View>
  </TouchableOpacity>

</View>

        </View>

        {/* ================= CURRENT QUEUE ================= */}

        <View style={styles.queueHeader}>

          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                marginTop: 0,
                marginBottom: 0,
              },
            ]}
          >
            Current Queue
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("Queue")}
          >
            <Text
              style={[
                styles.viewAll,
                {
                  color: colors.primary,
                },
              ]}
            >
              View All
            </Text>
          </TouchableOpacity>

        </View>

        {queuePatients.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="flask-outline"
              size={40}
              color={colors.primary}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              No patients in queue
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              New laboratory tests will appear here.
            </Text>
          </View>
        ) : (
          queuePatients.slice(0, 3).map((patient) => (
            <QueueCard
              key={patient.id}
              patient={patient}
              colors={colors}
            />
          ))
        )}

      </ScrollView>

      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}


/* ================================================= */
/* STAT CARD */
/* ================================================= */

function StatCard({
  icon,
  count,
  title,
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
          styles.iconCircle,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={32}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.statCount,
          {
            color: colors.text,
          },
        ]}
      >
        {count}
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


/* ================================================= */
/* ACTION CARD */
/* ================================================= */

function ActionCard({
  icon,
  title,
  colors,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.actionCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >

      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={27}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.actionTitle,
          {
            color: colors.text,
          },
        ]}
      >
        {title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textSecondary}
      />

    </TouchableOpacity>
  );
}


/* ================================================= */
/* QUEUE CARD */
/* ================================================= */

function QueueCard({
  patient,
  colors,
}) {
  let statusColor = colors.success;

  if (patient.status === "Waiting") {
    statusColor = colors.warning;
  }

  if (patient.status === "Sample Collected") {
    statusColor = colors.primary;
  }

  if (patient.status === "Processing") {
    statusColor = colors.blue;
  }

  return (
    <View
      style={[
        styles.queueCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >

      <View
        style={[
          styles.queueIcon,
          {
            backgroundColor: colors.mint,
          },
        ]}
      >
        <Ionicons
          name="person-outline"
          size={28}
          color={colors.primary}
        />
      </View>

      <View style={styles.queueInfo}>

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
            styles.testName,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {patient.testName}
        </Text>

        <Text
          style={[
            styles.cardNo,
            {
              color: colors.primary,
            },
          ]}
        >
          Card #{patient.cardNo}
        </Text>

      </View>

      <View style={styles.queueRight}>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusColor,
              },
            ]}
          >
            {patient.status}
          </Text>
        </View>

        <Text
          style={[
            styles.time,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {patient.time}
        </Text>

      </View>

    </View>
  );
}


/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

topBar: {
  height: 85,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  position: "relative",
  marginBottom: 20,
},

topButton: {
  width: 45,
  height: 50,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2,
},

headerTitleContainer: {
  position: "absolute",
  left: 55,
  right: 55,
  top: 8,
  alignItems: "center",
},

notificationDot: {
  position: "absolute",
  top: 8,
  right: 6,
  width: 10,
  height: 10,
  borderRadius: 5,
  borderWidth: 1.5,
  borderColor: "#FFFFFF",
},


  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
  },

  

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 10,
  },

  

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },



  statCard: {
    width: "46%",
    height: 165,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 18,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.12,
    shadowRadius: 8,

    elevation: 5,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  statCount: {
    fontSize: 25,
    fontWeight: "700",
    marginTop: 2,
  },

  statTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },

  

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  actionCard: {
    width: "48%",
    minHeight: 85,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",

    elevation: 3,
  },

  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  actionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },

  

  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 15,
  },

  viewAll: {
    fontSize: 15,
    fontWeight: "800",
  },

  

  queueCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },

  queueIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },

  queueInfo: {
    flex: 1,
    marginLeft: 13,
  },

  logo: {
  width: 100,
  height: 100,
  resizeMode: "contain",
},

  patientName: {
    fontSize: 17,
    fontWeight: "800",
  },

  testName: {
    fontSize: 13,
    marginTop: 4,
  },

  cardNo: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },

  queueRight: {
    alignItems: "flex-end",
    marginLeft: 5,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  time: {
    fontSize: 11,
    marginTop: 7,
  },

  

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 10,
  },

  emptyText: {
    fontSize: 13,
    marginTop: 5,
    textAlign: "center",
  },

  quickActionsContainer: {
  marginHorizontal: 18,
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},

quickActionCard: {
  width: "48%",
  minHeight: 120,
  borderRadius: 18,
  padding: 16,
  marginBottom: 12,
  justifyContent: "space-between",
  borderWidth: 1,

  // Shadow
  elevation: 3,
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.12,
  shadowRadius: 4,
},

quickActionIcon: {
  width: 46,
  height: 46,
  borderRadius: 23,
  alignItems: "center",
  justifyContent: "center",
},

quickActionTitle: {
  fontSize: 13,
  fontWeight: "800",
  lineHeight: 18,
  marginTop: 12,
},

quickActionSubtitle: {
  fontSize: 10,
  lineHeight: 15,
  marginTop: 3,
},

logoSection: {
  alignItems: "center",
  justifyContent: "center",
  marginTop: 40,
  marginBottom: 20,
},
appHeader: {
  marginTop: topPad(40),
  marginBottom: 25,
},

appHeaderTopBar: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

bellBtn: {
  padding: 6,
  position: "relative",
},

bellDot: {
  position: "absolute",
  top: -4,
  right: -6,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  paddingHorizontal: 4,
  backgroundColor: "#EF4444",
  borderWidth: 2,
  alignItems: "center",
  justifyContent: "center",
},

bellCount: {
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: "800",
},

appHeaderContent: {
  alignItems: "center",
  marginTop: 6,
},

appHeaderTitle: {
  fontSize: 22,
  fontWeight: "800",
  letterSpacing: 1,
},

appHeaderSubtitle: {
  marginTop: 2,
  fontSize: 12,
  fontWeight: "500",
},

logoCircle: {
  width: 72,
  height: 72,
  borderRadius: 36,
  borderWidth: 2.5,
  alignItems: "center",
  justifyContent: "center",
},

appLogo: {
  width: 58,
  height: 58,
},

logoTitle: {
  fontSize: 21,
  fontWeight: "800",
  marginTop: 7,
},

topSubtitle: {
  fontSize: 10,
  fontWeight: "500",
  marginTop: 3,
},
});