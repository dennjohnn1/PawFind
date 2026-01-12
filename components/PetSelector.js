import { View, ScrollView, TouchableOpacity, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "./CustomText"

export default function PetSelector({ pets, onSelect, selectedPetId }) {
  if (!pets || pets.length === 0) return null

  return (
    <View style={tw`mb-6`}>
      <View style={tw`flex-row justify-between items-center mb-3 px-1`}>
        <CustomText weight="SemiBold" style={tw`text-gray-900 text-sm`}>
          Select from your registered pets
        </CustomText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-2`}>
        {pets.map((pet) => {
          const isSelected = selectedPetId === pet.id
          return (
            <TouchableOpacity key={pet.id} onPress={() => onSelect(pet)} style={tw`mr-4 items-center`}>
              <View style={tw`relative`}>
                <View
                  style={tw`w-20 h-20 rounded-full border-2 ${isSelected ? "border-orange-500" : "border-gray-100"} p-1`}
                >
                  <Image
                    source={{ uri: pet.photoUrl || "/a-cute-pet.png" }}
                    style={tw`w-full h-full rounded-full`}
                    resizeMode="cover"
                  />
                </View>
                {isSelected && (
                  <View style={tw`absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1 border-2 border-white`}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </View>
              <CustomText
                weight={isSelected ? "Bold" : "Medium"}
                style={tw`text-[11px] mt-2 ${isSelected ? "text-orange-600" : "text-gray-600"}`}
                numberOfLines={1}
              >
                {pet.name}
              </CustomText>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}
