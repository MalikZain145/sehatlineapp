import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import GradientHeader from "../components/common/GradientHeader";
import Colors from "../constants/colors";
import { useTheme } from "../Theme/themeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function TermsConditionsScreen() {
  const { theme } = useTheme();
  return (
   <SafeAreaView
  style={[
    styles.container,
    {
      backgroundColor: theme.colors.background,
    },
  ]}
>

      <GradientHeader
        title="Terms & Conditions"
        subtitle="Hospital Pharmacy Management System"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

       <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Authorized Use</Text>

          <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            This application is intended solely for authorized
            pharmacists, healthcare professionals, and hospital staff.
            Unauthorized access, modification, or distribution of this
            application is strictly prohibited.
          </Text>
        </View>

       <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>User Responsibilities</Text>

        <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            • Verify prescriptions before dispensing medicines.{"\n"}
            • Maintain patient confidentiality at all times.{"\n"}
            • Protect login credentials from unauthorized access.{"\n"}
            • Follow all hospital pharmacy policies and procedures.{"\n"}
            • Ensure accurate medicine dispensing and record keeping.
          </Text>
        </View>

        <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>System Usage</Text>

          <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            The Hospital Pharmacy Management System is designed to
            support prescription processing, medicine dispensing,
            inventory management, patient queue handling,
            notifications, and Loan Prescription (LP) generation.
          </Text>
        </View>
<View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Loan Prescription (LP)</Text>

          <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            Loan Prescriptions should only be issued for medicines that
            are temporarily unavailable in the hospital pharmacy.
            Pharmacists must follow hospital approval procedures before
            generating an LP for any patient.
          </Text>
        </View>

        <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Security</Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            Users are responsible for maintaining the security of their
            accounts. Any unauthorized access, suspicious activity, or
            security breach should be reported immediately to the
            hospital administration.
          </Text>
        </View>

       <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Limitation of Use</Text>

        <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            This application is intended to assist pharmacists in their
            daily workflow. Final responsibility for prescription
            verification, medicine dispensing, and patient safety
            remains with the licensed pharmacist.
          </Text>
        </View>
<View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Acceptance of Terms</Text>

        <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            By accessing and using this application, users acknowledge
            that they have read, understood, and agreed to comply with
            these Terms & Conditions and all applicable hospital
            policies.
          </Text>
        </View>

        <Text
  style={[
    styles.footer,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
          Hospital Pharmacy Management System{"\n"}
          Version 1.0.0{"\n\n"}
          Developed for CDA Hospital Islamabad{"\n\n"}
          © 2026 All Rights Reserved
        </Text>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
    
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  card: {
   
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  heading: {
    fontSize: 18,
    fontWeight: "700",
   
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
  },

  footer: {
    textAlign: "center",
    marginTop: 20,
    
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 30,
  },

});