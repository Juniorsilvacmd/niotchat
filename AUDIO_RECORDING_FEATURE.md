# Funcionalidade de Gravação de Áudio

## Visão Geral

Foi implementada uma funcionalidade completa de gravação de áudio no sistema de chat, que permite aos usuários gravar e enviar mensagens de áudio diretamente através da interface web.

## Características Principais

### 1. Botão Inteligente
- **Formato de Microfone**: Quando não há texto digitado, o botão aparece como um microfone (ícone de gravação)
- **Formato de Envio**: Quando há texto digitado, o botão muda para o ícone de envio
- **Mudança Dinâmica**: A transição é automática baseada no estado do campo de texto

### 2. Interface de Gravação
- **Indicador Visual**: Durante a gravação, aparece um indicador vermelho pulsante
- **Contador de Tempo**: Mostra o tempo de gravação em formato MM:SS
- **Botão de Parar**: Botão quadrado para parar a gravação

### 3. Prévia do Áudio
- **Áudio Gravado**: Após parar a gravação, mostra o áudio gravado com tempo
- **Opções**: Botões para cancelar (X) ou enviar (ícone de envio)
- **Feedback Visual**: Interface azul para indicar áudio pronto para envio

## Tipos de Mídia Suportados

O sistema suporta os seguintes tipos de áudio conforme a API UAZAPI:

- **`audio`**: Áudio comum
- **`myaudio`**: Mensagem de voz (alternativa ao PTT)
- **`ptt`**: Mensagem de voz (Push-to-Talk)

## Como Usar

### 1. Iniciar Gravação
1. Clique no botão de microfone (quando não há texto)
2. Permita o acesso ao microfone quando solicitado
3. O indicador vermelho aparecerá mostrando que está gravando

### 2. Parar Gravação
1. Clique no botão quadrado para parar a gravação
2. O áudio gravado será mostrado na interface

### 3. Enviar ou Cancelar
1. **Enviar**: Clique no ícone de envio para enviar o áudio
2. **Cancelar**: Clique no X para cancelar e gravar novamente

### 4. Digitar Texto
- Se você começar a digitar texto, o botão automaticamente muda para o ícone de envio
- Você pode enviar texto normalmente ou clicar no microfone para gravar áudio

## Instruções na Interface

A interface mostra instruções dinâmicas na parte inferior:

- **Sem gravação**: "Pressione Enter para enviar, Shift + Enter para nova linha, ou clique no microfone para gravar áudio"
- **Gravando**: "Gravando áudio... Clique no quadrado para parar"
- **Áudio gravado**: "Áudio gravado. Clique no ícone de envio para enviar ou no X para cancelar"

## Tecnologias Utilizadas

### Frontend
- **MediaRecorder API**: Para gravação de áudio no navegador
- **WebM/Opus**: Formato de áudio otimizado para web
- **React Hooks**: Para gerenciamento de estado
- **Lucide React**: Para ícones

### Backend
- **Django REST Framework**: Para endpoints de API
- **UAZAPI Integration**: Para envio via WhatsApp
- **File Upload**: Para processamento de arquivos de áudio
- **Base64 Encoding**: Para compatibilidade com APIs externas

## Endpoints da API

### Enviar Mídia
```
POST /api/messages/send_media/
```

**Parâmetros:**
- `conversation_id`: ID da conversa
- `media_type`: Tipo de mídia (`audio`, `myaudio`, `ptt`)
- `file`: Arquivo de áudio
- `caption`: Legenda opcional

## Compatibilidade

### Navegadores Suportados
- Chrome 66+
- Firefox 60+
- Safari 14+
- Edge 79+

### Formatos de Áudio
- **Entrada**: WebM com codec Opus
- **Saída**: Compatível com WhatsApp via UAZAPI

## Limitações

1. **Permissões**: Requer permissão de microfone do navegador
2. **Tamanho**: Arquivos de áudio são limitados pelo WhatsApp (16MB)
3. **Formato**: Usa WebM/Opus para melhor compatibilidade
4. **HTTPS**: Em produção, requer HTTPS para acesso ao microfone

## Troubleshooting

### Problemas Comuns

1. **Microfone não funciona**
   - Verifique as permissões do navegador
   - Certifique-se de que está usando HTTPS em produção

2. **Erro ao enviar áudio**
   - Verifique a conexão com a UAZAPI
   - Confirme se o arquivo não excede 16MB

3. **Áudio não grava**
   - Verifique se o microfone está conectado
   - Teste em outro navegador

## Desenvolvimento

### Estrutura de Arquivos
```
frontend/frontend/src/components/ChatArea.jsx  # Componente principal
backend/conversations/views.py                 # Endpoints da API
```

### Estados do Componente
- `isRecording`: Se está gravando
- `recordingTime`: Tempo de gravação
- `audioBlob`: Dados do áudio gravado
- `audioUrl`: URL para preview do áudio

### Funções Principais
- `startRecording()`: Inicia gravação
- `stopRecording()`: Para gravação
- `cancelRecording()`: Cancela gravação
- `sendAudioMessage()`: Envia áudio
- `formatRecordingTime()`: Formata tempo

## Próximas Melhorias

1. **Visualização de Onda**: Adicionar visualização da forma de onda do áudio
2. **Compressão**: Implementar compressão automática para arquivos grandes
3. **Preview**: Permitir ouvir o áudio antes de enviar
4. **Qualidade**: Opções de qualidade de gravação
5. **Duração Máxima**: Limitar duração máxima de gravação 