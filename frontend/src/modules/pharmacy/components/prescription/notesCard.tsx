import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "../../constants/colors";

interface Props {
  notes: string;
}

export default function NotesCard({ notes }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Notes</Text>
      <Text style={styles.text}>{notes}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },

  text: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});