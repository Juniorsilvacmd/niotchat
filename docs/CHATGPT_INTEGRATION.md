# Integração com ChatGPT

## Visão Geral

O sistema Nio Chat agora possui integração completa com o ChatGPT da OpenAI, permitindo que cada empresa configure seu próprio agente IA personalizado para atendimento ao cliente.

## Arquitetura

### Backend

#### 1. Serviço OpenAI (`backend/core/openai_service.py`)

- **Classe `OpenAIService`**: Gerencia toda a comunicação com a API da OpenAI
- **Configuração dinâmica**: Cada empresa pode configurar seu próprio agente IA
- **Prompts personalizados**: Baseados na configuração da empresa (nome, personalidade, emojis, etc.)

#### 2. Endpoints

**Django REST Framework:**
- `POST /api/ia/atendimento/` - Endpoint principal para chat com IA

**FastAPI:**
- `POST /api/ia/chat` - Endpoint para chat em tempo real via WebSocket

### Frontend

#### Componente de Teste (`frontend/frontend/src/components/ChatGPTTest.jsx`)

Interface para testar a integração com ChatGPT, incluindo:
- Campo de mensagem
- Campo opcional para CPF (integração com SGP)
- Histórico de conversas
- Exibição de metadados (tokens, modelo, etc.)

## Configuração da Empresa

Cada empresa pode configurar seu agente IA através do painel administrativo:

### Campos Configuráveis

1. **Nome do Agente IA** (`nome_agente_ia`)
   - Nome personalizado do assistente virtual
   - Ex: "Nio Chat", "Assistente HJ", etc.

2. **Estilo de Personalidade** (`estilo_personalidade`)
   - Define o tom de comunicação
   - Ex: "Atencioso", "Carismático", "Profissional"

3. **Uso de Emojis** (`uso_emojis`)
   - `sempre`: Usa emojis naturalmente
   - `ocasionalmente`: Usa emojis moderadamente
   - `nunca`: Não usa emojis

4. **Identidade/Contexto** (`identidade_contexto`)
   - Descrição personalizada do agente
   - Contexto específico da empresa

## Como Usar

### 1. Configurar Empresa

1. Acesse o painel administrativo
2. Vá para "Dados do Provedor"
3. Configure os campos do agente IA:
   - Nome do agente
   - Estilo de personalidade
   - Uso de emojis
   - Identidade/contexto

### 2. Testar Integração

1. Acesse "Teste ChatGPT" no menu lateral
2. Digite uma mensagem
3. Opcionalmente, inclua um CPF para consulta no SGP
4. Clique em "Enviar"
5. Veja a resposta personalizada do ChatGPT

### 3. Integração com SGP

Se um CPF for fornecido:
1. O sistema consulta os dados do cliente no SGP
2. Os dados são incluídos no contexto do ChatGPT
3. O agente pode responder com informações específicas do cliente

## Exemplos de Uso

### Exemplo 1: Atendimento Básico
```
Usuário: "Olá, gostaria de saber sobre os planos de internet"
ChatGPT: "Olá! 😊 Sou o Nio Chat, assistente virtual da HJ Telecom. 
Ficarei feliz em te ajudar com nossos planos de internet! 
Temos opções que vão de 100 Mbps até 1 Gbps, com preços 
que cabem no seu bolso. Qual velocidade você está procurando?"
```

### Exemplo 2: Consulta com CPF
```
Usuário: "CPF 123.456.789-00 - Quais são meus planos ativos?"
ChatGPT: "Olá! 👋 Verifiquei seus dados e vejo que você é nosso cliente 
há 2 anos. Seus planos ativos são:
- Internet 200 Mbps: R$ 89,90/mês
- TV por assinatura: R$ 45,00/mês
Posso te ajudar com alguma alteração ou tem alguma dúvida?"
```

## Segurança

### Chave da API
- A chave da OpenAI está configurada no backend
- **IMPORTANTE**: Nunca exponha a chave no frontend
- Use variáveis de ambiente em produção

### Isolamento Multi-tenant
- Cada empresa só acessa sua própria configuração
- Respostas são personalizadas por empresa
- Logs de auditoria para monitoramento

## Monitoramento

### Logs
- Todas as interações são logadas
- Inclui tokens utilizados, modelo, empresa
- Facilita monitoramento de custos

### Métricas
- Tokens utilizados por empresa
- Frequência de uso
- Tempo de resposta

## Próximos Passos

1. **Integração com WhatsApp/Telegram**
   - Usar o mesmo serviço OpenAI
   - Respostas personalizadas por canal

2. **RAG (Retrieval Augmented Generation)**
   - Base de conhecimento da empresa
   - Documentos técnicos
   - FAQs personalizadas

3. **Análise de Sentimento**
   - Detectar satisfação do cliente
   - Escalar para atendente humano quando necessário

4. **Automação de Fluxos**
   - Abertura de chamados
   - Agendamento de visitas técnicas
   - Renovação de contratos

## Troubleshooting

### Erro: "Token não encontrado"
- Verifique se está logado
- Faça logout e login novamente

### Erro: "Empresa não encontrada"
- Verifique se a empresa está configurada
- Confirme se o usuário está associado à empresa

### Erro: "Erro ao processar mensagem"
- Verifique a conexão com a OpenAI
- Confirme se a chave da API está válida
- Verifique os logs do servidor

### Resposta muito lenta
- Verifique a conexão com a internet
- A API da OpenAI pode estar sobrecarregada
- Considere ajustar `max_tokens` no código

## Configuração Avançada

### Ajustar Parâmetros do Modelo
No arquivo `backend/core/openai_service.py`:

```python
self.model = "gpt-3.5-turbo"  # ou "gpt-4"
self.max_tokens = 1000         # Ajustar conforme necessidade
self.temperature = 0.7         # 0.0 = determinístico, 1.0 = criativo
```

### Adicionar Contexto Personalizado
No endpoint `/api/ia/atendimento/`:

```python
contexto = {
    'produtos_disponiveis': lista_produtos,
    'historico': historico_conversa,
    'dados_cliente': dados_sgp
}
```

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Teste com diferentes mensagens
3. Confirme a configuração da empresa
4. Entre em contato com o suporte técnico 