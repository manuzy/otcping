import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  recent: "🕐",
  people: "😀",
  nature: "🌱", 
  food: "🍎",
  activities: "⚽",
  travel: "🚗",
  objects: "💡",
  symbols: "❤️",
  flags: "🏁"
};

const EMOJI_DATA = {
  recent: ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "💯"],
  people: [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", 
    "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪",
    "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏",
    "😒", "🙄", "😬", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
    "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐",
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕",
    "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏"
  ],
  nature: [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
    "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤",
    "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛",
    "🦋", "🐌", "🐚", "🐞", "🐜", "🕷️", "🦟", "🦗", "🕸️", "🐢", "🐍", "🦎",
    "🌲", "🌳", "🌴", "🌵", "🌶️", "🍄", "🌾", "💐", "🌷", "🌹", "🥀", "🌺",
    "🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘"
  ],
  food: [
    "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑",
    "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥒", "🥬", "🌶️", "🌽",
    "🥕", "🥔", "🍠", "🥐", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🥞", "🥓",
    "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🌮", "🌯", "🥗",
    "🥘", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚",
    "🍘", "🍥", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🍰", "🎂", "🍮"
  ],
  activities: [
    "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅",
    "🏒", "🏑", "🥍", "🏏", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿",
    "⛷️", "🏂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🏇", "🧘", "🏄", "🏊", "🚣",
    "🚴", "🚵", "🧗", "🎯", "🎪", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁",
    "🎷", "🎺", "🎸", "🎻", "🎲", "🎮", "🎰", "🎳", "🎯", "🎪", "🎭", "🎨"
  ],
  travel: [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛",
    "🚜", "🛴", "🚲", "🛵", "🏍️", "🚁", "🚟", "🚠", "🚡", "🛰️", "🚀", "✈️",
    "🛫", "🛬", "⛵", "🚤", "🛶", "⛴️", "🛳️", "🚢", "⚓", "⛽", "🚧", "🚦",
    "🚥", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲",
    "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡"
  ],
  objects: [
    "💡", "🔦", "🕯️", "🔥", "💥", "💢", "💨", "💫", "💤", "💨", "🔔", "🔕",
    "📢", "📣", "📯", "🔊", "🔉", "🔈", "🎵", "🎶", "🎼", "🎹", "📱", "☎️",
    "📞", "📟", "📠", "🔋", "🔌", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽",
    "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎬", "📺", "📻",
    "⏰", "🕰️", "⏲️", "⏱️", "🕛", "🕧", "🕐", "🕜", "🕑", "🕝", "🕒", "🕞"
  ],
  symbols: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
    "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️",
    "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍",
    "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳",
    "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴"
  ],
  flags: [
    "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇦🇫", "🇦🇽", "🇦🇱", "🇩🇿",
    "🇦🇸", "🇦🇩", "🇦🇴", "🇦🇮", "🇦🇶", "🇦🇬", "🇦🇷", "🇦🇲", "🇦🇼", "🇦🇺", "🇦🇹", "🇦🇿",
    "🇧🇸", "🇧🇭", "🇧🇩", "🇧🇧", "🇧🇾", "🇧🇪", "🇧🇿", "🇧🇯", "🇧🇲", "🇧🇹", "🇧🇴", "🇧🇦",
    "🇧🇼", "🇧🇷", "🇮🇴", "🇻🇬", "🇧🇳", "🇧🇬", "🇧🇫", "🇧🇮", "🇰🇭", "🇨🇲", "🇨🇦", "🇮🇨"
  ]
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  children?: React.ReactNode;
}

export const EmojiPicker = ({ onEmojiSelect, children }: EmojiPickerProps) => {
  const [recentEmojis, setRecentEmojis] = useState<string[]>(
    JSON.parse(localStorage.getItem('recentEmojis') || '[]')
  );

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    
    // Update recent emojis
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 8);
    setRecentEmojis(newRecent);
    localStorage.setItem('recentEmojis', JSON.stringify(newRecent));
  };

  const renderEmojiGrid = (emojis: string[]) => (
    <div className="grid grid-cols-8 gap-1 p-2">
      {emojis.map((emoji, index) => (
        <Button
          key={`${emoji}-${index}`}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted text-lg"
          onClick={() => handleEmojiClick(emoji)}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-9 h-10">
            {Object.entries(EMOJI_CATEGORIES).map(([key, icon]) => (
              <TabsTrigger key={key} value={key} className="text-xs p-1">
                {icon}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(EMOJI_DATA).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <ScrollArea className="h-64">
                {renderEmojiGrid(
                  category === 'recent' && recentEmojis.length > 0 
                    ? recentEmojis 
                    : emojis
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};