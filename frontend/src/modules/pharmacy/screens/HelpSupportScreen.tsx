import React, { useState, useEffect } from "react";
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";

import Colors from "../constants/colors";
import GradientHeader from "../components/common/GradientHeader";
import SupportCard from "../components/support/supportCard";
import { Text } from "react-native";
import { Linking } from "react-native";
import FAQItem from "../components/support/FAQItem";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function HelpSupportScreen() {
const navigation = useNavigation<any>();
const { theme } = useTheme();
  const [loading, setLoading] = useMinLoading(true);
  useEffect(() => { setLoading(false); }, []);
  const callSupport = () => {
  Linking.openURL("tel:+92519200000");
};

const emailSupport = () => {
  Linking.openURL(
    "mailto:support@cdahospital.pk?subject=Pharmacy Support"
  );
};

const openWebsite = () => {
  Linking.openURL("https://www.cdahospital.pk");
};

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
        title="Help & Support"
        subtitle="Need assistance? We're here to help."
      />

      {loading ? <SkeletonList count={6} dark={theme.dark} /> : <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text 
  style={[
    styles.sectionTitle,
    {
      color: theme.colors.text,
    },
  ]}
>
  Frequently Asked Questions
</Text>

<FAQItem
  question="How do I prepare medicines?"
  answer="Open the patient's prescription from the queue, verify the medicines, prepare them, and mark the order as Ready for Pickup."
/>

<FAQItem
  question="How do I update inventory?"
  answer="Open Inventory, select a medicine, edit the stock quantity, and save your changes."
/>

<FAQItem
  question="How do I notify patients?"
  answer="After preparing medicines, tap 'Ready for Pickup' and the patient will receive a notification."
/>

<Text
  style={[
    styles.sectionTitle,
    {
      color: theme.colors.text,
    },
  ]}
>
  Contact Support
</Text>

<SupportCard
  icon="call-outline"
  title="Call Pharmacy"
  subtitle="+92 51 9200000"
  onPress={callSupport}
/>

<SupportCard
  icon="mail-outline"
  title="Email Support"
  subtitle="support@cdahospital.pk"
  onPress={emailSupport}
/>
<SupportCard
  icon="globe-outline"
  title="Hospital Website"
  subtitle="www.cdahospital.pk"
  onPress={openWebsite}
/>

<Text
  style={[
    styles.sectionTitle,
    {
      color: theme.colors.text,
    },
  ]}
>
  Report an Issue
</Text>

<SupportCard
  icon="warning-outline"
  title="Report a Problem"
  subtitle="Tell us about a technical issue"
  onPress={() => navigation.navigate("ReportProblem")}
/>

      </ScrollView>}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  textContainer: {
  flex: 1,
},
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
    
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
  fontSize: 22,
  fontWeight: "700",
  
  marginTop: 10,
  marginBottom: 16,
},
subtitle: {
  fontSize: 13,
 
  marginTop: 2,
},
});