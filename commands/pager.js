const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
  } = require('discord.js');
  const roles = require('../roles.json');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('pager')
      .setDescription('Envía un pager al personal de facción.'),
  
    async execute(interaction) {
      const roleOptions = Object.values(roles).map(role => ({
        label: role.label,
        value: role.id
      }));
  
      const roleMenu = new StringSelectMenuBuilder()
        .setCustomId('select_roles')
        .setPlaceholder('Selecciona uno o más roles...')
        .setMinValues(1)
        .setMaxValues(roleOptions.length)
        .addOptions(roleOptions);
  
      const row = new ActionRowBuilder().addComponents(roleMenu);
  
      await interaction.reply({
        content: '📟 Completá la información para el pager:',
        components: [row],
        ephemeral: true
      });
    },
  };
  