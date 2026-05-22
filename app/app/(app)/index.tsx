import { Text, View } from 'react-native';

export default function AppIndex() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-muted-foreground text-sm">
        Select a note or press + to create one.
      </Text>
    </View>
  );
}
