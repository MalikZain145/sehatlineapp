
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import GradientHeader from "../../components/common/GradientHeader";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function HelpSupportScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
const [expandedHelp, setExpandedHelp] = useState(null);
  const supportOptions = [
  {
    icon: "people-outline",
    title: "Patient Queue",
    subtitle: "How to process patients in the laboratory queue",
    answer:
      "Open Patient Queue from the dashboard to view patients waiting for laboratory tests. Tap a patient to view their test details and patient information. Process the requested test and, after completing it, upload the completed laboratory report. Once the report is submitted, the patient is completed and you can continue with the next patient. Completed patients can be viewed in Completed Reports.",
  },

  {
    icon: "flask-outline",
    title: "Test Catalog",
    subtitle: "Which tests are available in the hospital laboratory",
    answer:
      "The Test Catalog shows all laboratory tests currently available in the hospital laboratory. Each test displays important information such as the test name, category, sample type, processing time, price, and availability. Use the catalog to check which tests can currently be performed in the hospital laboratory.",
  },

  {
    icon: "document-text-outline",
    title: "Completed Reports",
    subtitle: "Where completed laboratory reports can be viewed",
    answer:
      "After completing a laboratory test and uploading its report, the report becomes available in Completed Reports. Open Completed Reports to find completed patient reports and select a report to review its patient, test, and report information. This section keeps completed laboratory reports organized for later reference.",
  },

  {
    icon: "cube-outline",
    title: "Inventory & Requisitions",
    subtitle: "How to manage stock and request supplies from admin",
    answer:
      "Use Inventory to view the laboratory supplies currently available. When supplies are running low, open Requisitions and select the required supply, enter the quantity needed, and submit the request. The requisition is then sent to Admin for review and fulfillment.",
  },

  {
    icon: "notifications-outline",
    title: "Notifications",
    subtitle: "How to view laboratory updates and alerts",
    answer:
      "The Notifications section displays important laboratory updates and alerts. These may include new patient or test requests, requisition updates, and other system notifications. Open Notifications regularly to stay updated with laboratory activities.",
  },
];
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

        <GradientHeader title="Help & Support" />

        {/* Welcome Card */}

        <View
          style={[
            styles.welcomeCard,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <View
            style={[
              styles.welcomeIcon,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Ionicons
              name="help-circle"
              size={35}
              color={colors.primary}
            />
          </View>

          <View style={styles.welcomeText}>
            <Text
              style={[
                styles.welcomeTitle,
                {
                  color: colors.darkTeal,
                },
              ]}
            >
              How can we help?
            </Text>

            <Text
              style={[
                styles.welcomeSubtitle,
                {
                  color: colors.darkTeal,
                },
              ]}
            >
              Find answers or contact our support
              team.
            </Text>
          </View>
        </View>

        {/* Common Help */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Common Help
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
        {supportOptions.map((item, index) => {
  const isExpanded = expandedHelp === index;

  return (
    <TouchableOpacity
      key={index}
      activeOpacity={0.85}
      onPress={() => {
        setExpandedHelp(
          isExpanded ? null : index
        );
      }}
      style={[
        styles.supportCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* CARD HEADER */}

      <View style={styles.supportHeader}>

        <View
          style={[
            styles.supportIcon,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={styles.supportContent}>
          <Text
            style={[
              styles.supportTitle,
              {
                color: colors.text,
              },
            ]}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.supportSubtitle,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {item.subtitle}
          </Text>
        </View>

        <Ionicons
          name={
            isExpanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={20}
          color={colors.textSecondary}
        />

      </View>

      {/* EXPANDED ANSWER */}

      {isExpanded && (
        <View
          style={[
            styles.answerContainer,
            {
              borderTopColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.answerText,
              {
                color: colors.text,
              },
            ]}
          >
            {item.answer}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
})}
        </View>

        {/* Contact Support */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Contact Support
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.contactRow}
          >
            <View
              style={[
                styles.contactIcon,
                {
                  backgroundColor: colors.mint,
                },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.contactText}>
              <Text
                style={[
                  styles.contactTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Call Support
              </Text>

              <Text
                style={[
                  styles.contactValue,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                +92 51 1234567
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.contactRow}
          >
            <View
              style={[
                styles.contactIcon,
                {
                  backgroundColor: colors.mint,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.contactText}>
              <Text
                style={[
                  styles.contactTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Email Support
              </Text>

              <Text
                style={[
                  styles.contactValue,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                support@laboratorysystem.com
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Report Problem */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("ReportProblem")
          }
          style={[
            styles.problemButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="bug-outline"
            size={20}
            color={colors.white}
          />

          <Text
            style={[
              styles.problemButtonText,
              {
                color: colors.white,
              },
            ]}
          >
            Report a Problem
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.footer,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          Our support team is available to help
          laboratory staff.
        </Text>
      </ScrollView>
    </View>
  );
}

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

  backButton: {
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

  welcomeCard: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  welcomeIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },

  welcomeText: {
    flex: 1,
    marginLeft: 14,
  },

  welcomeTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  welcomeSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
  },

  card: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    elevation: 2,
  },

  helpRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  helpText: {
    flex: 1,
    marginLeft: 13,
    marginRight: 10,
  },

  helpTitle: {
    fontSize: 14,
    fontWeight: "700",
  },

  helpSubtitle: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  contactRow: {
    minHeight: 75,
    flexDirection: "row",
    alignItems: "center",
  },

  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  contactText: {
    marginLeft: 13,
  },

  contactTitle: {
    fontSize: 14,
    fontWeight: "700",
  },

  contactValue: {
    fontSize: 12,
    marginTop: 4,
  },

  problemButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 25,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  problemButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 22,
  },
 supportCard: {
  marginHorizontal: 18,
  marginBottom: 4,
  overflow: "hidden",
},

supportHeader: {
  minHeight: 70,
  paddingVertical: 12,
  flexDirection: "row",
  alignItems: "center",
},

supportIcon: {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
},

supportContent: {
  flex: 1,
  marginLeft: 13,
  marginRight: 10,
},

supportTitle: {
  fontSize: 14,
  fontWeight: "800",
},

supportSubtitle: {
  fontSize: 11,
  lineHeight: 16,
  marginTop: 3,
},

answerContainer: {
  marginLeft: 57,
  marginRight: 10,
  paddingTop: 4,
  paddingBottom: 16,
  paddingRight: 8,
},

answerText: {
  fontSize: 12,
  lineHeight: 19,
},
});