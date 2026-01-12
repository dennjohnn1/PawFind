import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import CustomText from "../../components/CustomText";

export default function AISearchScreen() {
  return (
    <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
      <CustomText weight="SemiBold" style={tw`text-xl`}>AI Search Screen</CustomText>
    </SafeAreaView>
  );
}
