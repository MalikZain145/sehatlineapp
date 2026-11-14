import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "../../constants/colors";

interface Props {
  completed: number;
  total: number;
}

export default function PreparationProgress({
  completed,
  total,
}: Props) {
  const percentage = (completed / total) * 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Preparation Progress
      </Text>

      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%` },
          ]}
        />
      </View>

      <Text style={styles.progressText}>
        {completed} of {total} Medicines Prepared
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },

  progressBackground: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },

  progressText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});