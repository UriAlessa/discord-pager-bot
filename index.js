const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
  } = require('discord.js');
  const fs = require('node:fs');
  const path = require('node:path');
  require('dotenv').config();
  
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
  });
  
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }
  
  // Almacenamiento temporal
  const userSelections = new Map();
  const activePagers = new Map(); // messageId -> pagerData
  
  client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    }
  
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_roles') {
      const selectedRoles = interaction.values;
      const userId = interaction.user.id;
  
      if (!userSelections.has(userId)) userSelections.set(userId, {});
      userSelections.get(userId).roles = selectedRoles;
  
      const modal = new ModalBuilder()
        .setCustomId('modal_pager')
        .setTitle('Completar pager');
  
      const situacionInput = new TextInputBuilder()
        .setCustomId('situacion')
        .setLabel('Situación')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
  
      const lugarInput = new TextInputBuilder()
        .setCustomId('lugar')
        .setLabel('Ubicación')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  
      modal.addComponents(
        new ActionRowBuilder().addComponents(situacionInput),
        new ActionRowBuilder().addComponents(lugarInput)
      );
  
      await interaction.showModal(modal);
    }
  
    if (interaction.isModalSubmit() && interaction.customId === 'modal_pager') {
      const userId = interaction.user.id;
      const data = userSelections.get(userId);
  
      if (!data || !data.roles) {
        return interaction.reply({ content: '❌ No se pudo recuperar la información. Intentá de nuevo.', ephemeral: true });
      }
  
      const situacion = interaction.fields.getTextInputValue('situacion');
      const lugar = interaction.fields.getTextInputValue('lugar');
      const estado = 'ACTIVO';
      const roleMentions = data.roles.map(id => `<@&${id}>`).join(' ');
  
      const embed = new EmbedBuilder()
        .setTitle('📟 PAGER ENVIADO')
        .setColor(0x2f3136)
        .addFields(
          { name: '👮‍♂️ Estado', value: estado, inline: true },
          { name: '📍 Ubicación', value: lugar, inline: true },
          { name: '📄 Situación', value: situacion, inline: false },
          { name: '🔔 Notificados', value: roleMentions || 'Ninguno', inline: false },
          { name: '✅ Respondieron', value: 'Ninguno', inline: false }
        )
        .setFooter({ text: `Enviado por ${interaction.member?.nickname || interaction.user.username}` })
        .setTimestamp();
  
      const dummyId = 'pending_id'; // se sobreescribirá al enviar el mensaje
  
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`responder_${dummyId}`)
          .setLabel('✅ Responder')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cerrar_${dummyId}`)
          .setLabel('📴 Cerrar Pager')
          .setStyle(ButtonStyle.Danger)
      );
  
      const sent = await interaction.reply({
        content: roleMentions,
        embeds: [embed],
        components: [buttons],
        allowedMentions: { parse: ['roles'] }
      });
  
      const msg = await interaction.fetchReply();
      const msgId = msg.id;
  
      // Actualizar botones con el mensaje ID real
      const updatedButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`responder_${msgId}`)
          .setLabel('✅ Responder')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cerrar_${msgId}`)
          .setLabel('📴 Cerrar Pager')
          .setStyle(ButtonStyle.Danger)
      );
  
      await msg.edit({
        embeds: [embed],
        components: [updatedButtons]
      });
  
      activePagers.set(msgId, {
        embed,
        roles: data.roles,
        situacion,
        lugar,
        estado,
        responders: []
      });
  
      userSelections.delete(userId);
    }
  
    if (interaction.isButton()) {
      const [action, pagerId] = interaction.customId.split('_');
      const pagerData = activePagers.get(pagerId);
  
      if (!pagerData) {
        return interaction.reply({ content: '⚠️ Este pager ya no está activo o no se encontró.', ephemeral: true });
      }
  
      if (action === 'responder') {
        if (!pagerData.responders.includes(interaction.user.id)) {
          pagerData.responders.push(interaction.user.id);
  
          pagerData.embed.spliceFields(4, 1, {
            name: '✅ Respondieron',
            value: pagerData.responders.map(id => `<@${id}>`).join('\n')
          });
  
          await interaction.update({
            embeds: [pagerData.embed],
            components: interaction.message.components
          });
        } else {
          await interaction.reply({ content: 'Ya respondiste a este pager.', ephemeral: true });
        }
      }
  
      if (action === 'cerrar') {
        pagerData.embed.setColor('Red');
        pagerData.embed.spliceFields(0, 1, { name: '👮‍♂️ Estado', value: 'CERRADO', inline: true });
  
        await interaction.update({
          embeds: [pagerData.embed],
          components: []
        });
  
        activePagers.delete(pagerId);
      }
    }
  });
  
  client.once('ready', () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);
  });
  
  client.login(process.env.TOKEN);
  