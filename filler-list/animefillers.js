// Anime List 3.0 Plugin

module.exports = function(Plugin) {
    const config = {
        name: 'Список филлеров',
        id: 'filler-list',
        description: 'Список филлеров для аниме: Naruto, Naruto: Shippuuden, Bleach, Fairy Tail, One Piece. Последнее обновление: 15.10.2017',
        version: '1.0.0',
        author: 'VLADOS776',
		repo: 'https://github.com/VLADOS776/al3.0-plugin-Filler-List'
    }
	
	let Fillers = {
		'Naruto': ['26', '97', '99', '101-106', '136-220'],
		'Naruto: Shippuuden': ['28', '49', '57-71', '90-112', '127', '144-151', '170-171', '176-178', '180-196', '213', '223-242', '257-260', '271', '279-281', '284-295', '303-320', '347-361', '376-377', '388-390', '394-413', '416-417', '419', '422-423', '427-457', '460-462', '464-468', '480-483'],
		'Bleach': ['33', '50', '64-109', '128-137', '147-149', '168-190', '204-205', '213-214', '228-266', '287', '298-299', '303-305', '311-342', '355'],
		'Fairy Tail': ['9', '19-20', '49-50', '69-75', '125-150', '202-226', '246', '256', '268'],
		'One Piece': ['50-51', '54-60', '93', '98-99', '101-102', '131-143', '196-206', '213-216', '220-226', '279-283', '291-292', '303', '317-319', '326-336', '382-384', '406-407', '426-429', '457-458', '492', '497-499', '506', '542', '575-578', '590', '626-628', '653', '747-751', '775', '780-782', '801', '807']
	}
	Fillers['Naruto: Shippuden'] = Fillers['Naruto: Shippuuden']
    
    Plugin.newPlugin(config, {
		onEvent: function(event) {
			if (event.type === 'watch') {
				if (Fillers[event.selected.name]) {
					let filler = isFiller(event.selected.name, event.watch.ep);
					
					setTimeout(function() {
						if (!jQuery('.is_filler').length) {
							jQuery('h3').append('<small class="is_filler ml-3 p-1 text-white" style="font-size: 13px; vertical-align: middle;"></small>');
						}
						
						let $el = jQuery('.is_filler');
						
						if (filler) {
							$el.removeClass('bg-success');
							$el.addClass('bg-danger');
							$el.text('Филлер');
						} else {
							$el.removeClass('bg-danger');
							$el.addClass('bg-success');
							$el.text('Канон');
						}
					}, 100)
				}
			}
		}
    })
	
	function isFiller(anime, ep) {
		let filler = false;
		Fillers[anime].forEach(item => {
			if (item.indexOf('-') !== -1) {
				let range = item.split('-').map(itm => parseInt(itm));
				if (ep >= range[0] && ep <= range[1]) filler = true;
			} else {
				if (ep === parseInt(item)) {
					filler = true;
				}
			}
		})
		
		return filler;
	}
}