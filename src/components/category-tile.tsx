import { SymbolView, type SFSymbol } from 'expo-symbols';
import { View } from 'react-native';

import { radius } from '@/constants/theme';

type Props = {
  icon: string;
  color: string;
  tint: string;
};

export function CategoryTile({ icon, color, tint }: Props) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.tile,
        backgroundColor: tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolView name={icon as SFSymbol} size={18} tintColor={color} />
    </View>
  );
}
