import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Categorias de emojis do WhatsApp
const emojiCategories = {
  'Faces': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠'
  ],
  'Gestos': [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'
  ],
  'Animais': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'
  ],
  'Comida': [
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥣', '🥗', '🍲', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍷', '🥂', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥡', '🥢', '🥣', '🥤', '🥥', '🥦', '🥧', '🧁', '🥮', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍷', '🥂', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'
  ],
  'Atividades': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️‍♂️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾‍♂️', '🏊‍♀️', '🏊‍♂️', '🚣‍♀️', '🚣‍♂️', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄‍♂️', '🏇', '🚴‍♀️', '🚴‍♂️', '🚵‍♀️', '🚵‍♂️', '🎽', '🏅', '🎖️', '🥇', '🥈', '🥉', '🏆', '🏆', '🎗️', '🎟️', '🎫', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🎨', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '📺', '📻', '🎙️', '🎚️', '🎛️', '📽️', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '📽️', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '📽️', '📞', '📟', '📠'
  ],
  'Símbolos': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'
  ]
};

const EmojiPicker = ({ onEmojiSelect, isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Faces');
  const isDarkTheme = useTheme();

  const filteredEmojis = Object.entries(emojiCategories).reduce((acc, [category, emojis]) => {
    if (searchTerm === '' || category.toLowerCase().includes(searchTerm.toLowerCase())) {
      const filtered = emojis.filter(emoji => 
        searchTerm === '' || emoji.includes(searchTerm)
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    }
    return acc;
  }, {});

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${isDarkTheme ? 'bg-gray-800 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-200'} rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkTheme ? 'border-gray-600' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold">Selecionar Emoji</h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-colors ${isDarkTheme ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className={`p-4 border-b ${isDarkTheme ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Buscar emojis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkTheme 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        </div>

        {/* Categories */}
        <div className={`flex border-b overflow-x-auto ${isDarkTheme ? 'border-gray-600' : 'border-gray-200'}`}>
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? isDarkTheme 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-blue-600 border-b-2 border-blue-600'
                  : isDarkTheme
                    ? 'text-gray-300 hover:text-gray-100'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emojis Grid */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {(() => {
            // Se há termo de busca, mostrar todos os resultados filtrados
            if (searchTerm) {
              return Object.entries(filteredEmojis).map(([category, emojis]) => (
                <div key={category} className="mb-6">
                  <h4 className={`text-sm font-medium mb-3 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>{category}</h4>
                                  <div className="grid grid-cols-8 gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={`${category}-${index}`}
                      onClick={() => handleEmojiClick(emoji)}
                      className={`w-10 h-10 text-2xl rounded-lg transition-colors flex items-center justify-center ${
                        isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                </div>
              ));
            }
            
            // Se não há busca, mostrar apenas a categoria selecionada
            const selectedEmojis = emojiCategories[selectedCategory] || [];
            return (
              <div className="mb-6">
                <h4 className={`text-sm font-medium mb-3 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCategory}</h4>
                <div className="grid grid-cols-8 gap-2">
                  {selectedEmojis.map((emoji, index) => (
                    <button
                      key={`${selectedCategory}-${index}`}
                      onClick={() => handleEmojiClick(emoji)}
                      className={`w-10 h-10 text-2xl rounded-lg transition-colors flex items-center justify-center ${
                        isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker; 