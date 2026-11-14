import React from "react";
import {
  View,
 Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/colors";

interface Props {
  counter: number;
  selected: boolean;
  onPress: () => void;
}

export default function PickupCounterCard({
  counter,
  selected,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.selectedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={
          selected
            ? "radiobox-marked"
            : "radiobox-blank"
        }
        size={24}
        color={selected ? Colors.primary : "#9CA3AF"}
      />

      <Text style={styles.text}>
        Counter {counter}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.09, shadowRadius: 2.6, elevation: 2,
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },

  text: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
});