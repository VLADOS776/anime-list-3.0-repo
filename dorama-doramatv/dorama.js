// Anime List 3.0 Plugin

module.exports = function (Plugin, pluginPath) {
    const config = {
        name: 'Дорамы',
        id: 'dorama-doramatv',
        description: 'Смотрите дорамы с сайта doramatv.ru',
        version: '1.1.0',
        minAppVersion: '1.6.0',
        author: 'VLADOS776',
        category: ['Видео'],
        icon: 'icon.png',
        dependencies: ['vue', 'request', 'cheerio', 'db']
    }

    const path = require('path'),
          fs = require('fs');
    
    let Vue, request, cheerio;
    
    let DB,
        doramasInDB=[];
    
    let genres = {
        "арт-хаус": "art_house",
        "бизнес": "business",
        "биография": "biografiia",
        "боевик": "action",
        "боевые искусства": "fighting",
        "вампиры": "vampires",
        "вестерн": "vestern",
        "военный": "voennyi",
        "гей-тема": "boys",
        "гендерная интрига": "gender_intriga",
        "детектив": "detective",
        "документальный": "dokumentalnyi",
        "драма": "drama",
        "дружба": "friendship",
        "игра": "game",
        "исторический": "historical",
        "кайдзю": "kaiju",
        "катастрофа": "disaster",
        "комедия": "comedy",
        "концерт": "concert",
        "криминал": "crime",
        "лайв-экшн": "live_action",
        "лесби-тема": "girls",
        "медицина": "medicine",
        "мелодрама": "melodrama",
        "мистика": "mystic",
        "музыкальный": "musical",
        "мюзикл": "miuzikl",
        "научная фантастика": "science_fiction",
        "нуар": "noir",
        "пародия": "parody",
        "повседневность": "daily",
        "политика": "policy",
        "приключения": "adventures",
        "психология": "psychology",
        "радиошоу": "radio_show",
        "романтика": "romance",
        "саспенс": "suspense",
        "семейный": "family",
        "ситком": "sitcom",
        "сказка": "skazka",
        "спорт": "sport",
        "тайга": "taiga",
        "телешоу": "tv_show",
        "токусацу": "tokusatsu",
        "трагедия": "tragedy",
        "триллер": "thriller",
        "ужасы": "horror",
        "фантастика": "fantastic",
        "фэнтези": "fantasy",
        "школа": "school",
        "эротика": "erotic"
    }

    function init(opt) {
        Vue = opt.dependencies.vue;
        request = opt.dependencies.request;
        cheerio = opt.dependencies.cheerio;
        
        let css = fs.readFileSync(path.join(pluginPath.dir, 'style.css'), 'utf-8');
        jQuery('body').append(`<style>${css}</style>`);
        
        let SelectedDorama = null,
            historyQuery= '',
            historyResults = null;

        Vue.component('dorama-main', {
            template: getTemplate('search'),
            data: function() {
                return {
                    query: historyQuery,
                    results: historyResults,
                    searching: false,
                    searchTimer: null,
                    allDoramas: doramasInDB
                }
            },
            watch: {
                query: function(val) {
                    if (val === historyQuery) return;
                    if (val == '') {
                        this.results = null;
                        historyResults = null;
                    }
                    if (this.searchTimer) clearTimeout(this.searchTimer);
                    
                    historyQuery = this.query;
                    this.searchTimer = setTimeout(_ => {
                        if (this.query.length) this.search();
                    }, 1000)
                }
            },
            methods: {
                search: function() {
                    this.searching = true;
                    this.results = null;
                    
                    search(this.query).then(results => {
                        this.searching = false;
                        this.results = results;
                        
                        historyResults = this.results;
                    })
                },
                show_info: function(dorama) {
                    if (typeof dorama === 'string') {
                        getDoramaInfo(dorama).then(info => {
                            SelectedDorama = info;
                            SelectedDorama.inDB = isInDB(info);
                            this.$root.change_page('dorama-info');
                        })
                        .catch(err => console.error(err))
                    } else if (typeof dorama === 'object') {
                        SelectedDorama = dorama;
                        SelectedDorama.inDB = isInDB(dorama);
                        this.$root.change_page('dorama-info');
                    }
                }
            }
        })
        Vue.component('dorama-info', {
            template: getTemplate('info'),
            data: function() {
                return {
                    selected: SelectedDorama,
                    refreshing: false
                }
            },
            computed: {
                favoriteClass: function() {
                    return {
                        'btn-outline-info': !this.selected.inDB,
                        'btn-info': this.selected.inDB
                    }
                }
            },
            methods: {
                show_search: function() {
                    this.$root.change_page('dorama-main');
                },
                watch: function() {
                    this.$root.change_page('dorama-watch');
                },
                search_genre: function(genre) {
                    search(genre).then(results => {
                        historyQuery = `жанр:"${genre}"` ;
                        historyResults = results;
                        this.show_search();
                    })
                },
                favorite: function() {
                    if (!this.selected.inDB) {
                        DB.insert(JSON.parse(JSON.stringify(this.selected)), (err, doc) => {
                            if (err) console.error(err);

                            this.$set(this.selected, 'inDB', true);
                            
                            updateAllDoramas();
                        })
                    } else {
                        DB.remove({ name: this.selected.name }, {}, (err, doc) => {
                            this.$set(this.selected, 'inDB', false);
                            
                            updateAllDoramas();
                        })
                    }
                },
                refresh: function() {
                    this.refreshing = true;
                    getDoramaInfo(this.selected.link).then((dorama) => {
                        Object.assign(SelectedDorama, dorama);
                        this.selected = SelectedDorama;
                        
                        if (this.selected.inDB) {
                            DB.update({ name: this.selected.name }, JSON.parse(JSON.stringify(this.selected)), {}, function(err) {
                                if (err) console.error(err);
                            })
                        }
                        this.refreshing = false;
                    })
                }
            }
        })
        Vue.component('dorama-watch', {
            template: getTemplate('watch'),
            data: function() {
                return {
                    selected: SelectedDorama,
                    episode: null,
                    loading: true,
                    videoEmbed: null,
                    videos: null,
                    episodes: null
                }
            },
            computed: {
                epNum: function() {
                    return this.episodes.findIndex(el => el == this.episode);
                }
            },
            watch: {
                episode: function(val, oldVal) {
                    if (oldVal == null) return;
                    
                    this.loading = true;
                    this.videos = null;
                    this.videoEmbed = null;
                    
                    this.watch_ep(val.link);
                }
            },
            methods: {
                back: function() {
                    this.$root.change_page('dorama-info');
                },
                watch_ep: function(link) {
                    getWatch(link).then(data => {
                        this.videos = data.videos;
                        this.videoEmbed = data.videos[0].embed;
                        if (!this.episodes) this.episodes = data.episodes;
                        if (!this.episode) {
                            if (this.selected.watched != null) {
                                if (this.selected.watched >= this.selected.links.length) {
                                    this.episode = data.episodes[this.selected.watched ];
                                } else {
                                    this.episode = data.episodes[this.selected.watched + 1];
                                }
                            } else {
                                this.episode = data.episodes[0];
                            }
                        }
                        this.loading = false;
                    })
                },
                prevEp: function() {
                    if (this.epNum < 1 ) return;
                    this.episode = this.episodes[this.epNum - 1];
                },
                nextEp: function() {
                    if (this.epNum == this.episodes.length - 1) return;
                    this.episode = this.episodes[this.epNum + 1];
                },
                markAsWatched: function() {
                    let markEp = this.epNum;
                    if (this.selected.watched != null && this.selected.watched == this.epNum) {
                        --markEp;
                    }
                    this.$set(this.selected, 'watched', markEp);
                    if (!this.selected.inDB) {
                        DB.insert(this.selected, (err, doc) => {
                            if (err) console.error(err);

                            this.$set(this.selected, 'inDB', true);
                            
                            updateAllDoramas();
                        })
                    } else {
                        DB.update({ name: this.selected.name }, { $set: { 'watched': markEp } }, {}, function(err, newDoc) {
                            if (err) console.error(err);
                            
                            updateAllDoramas();
                        })
                    }
                }
            },
            mounted: function() {
                if (this.selected.watched != null && this.selected.links) {
                    if (this.selected.watched >= this.selected.links.length) {
                        this.watch_ep(this.selected.links[this.selected.watched]);
                    } else {
                        this.watch_ep(this.selected.links[this.selected.watched + 1]);
                    }
                } else {
                    this.watch_ep(this.selected.watchLink)
                }
            }
        })
        
        // Загружаем базу данных с дорамами
        opt.dependencies.db.load('dorama')
            .then(base => {
                DB = base;
            
                // Загружем все дорамы
                updateAllDoramas();
            })
            .catch(err => console.error('Ошибка при загрузки базы данных!', err));
        
        console.log(`Dorama plugin is init!`);
    }

    function getTemplate(name) {
        return fs.readFileSync(path.join(pluginPath.dir, 'templates', name + '.html'), 'utf-8')
    }
    
    function getDoramaInfo(link) {
        if (link.startsWith('/')) link = 'http://doramatv.ru' + link;
        if (link.indexOf('mtr=') === -1) {
            link += '?mtr=1';
        }
        
        return new Promise((res, rej) => {
            request(link, (err, response, body) => {
                if (err) {
                    rej(err);
                    return;
                }
                
                let $ = cheerio.load(body),
                    info = {},
                    tmp;
                
                info.link = link;
                info.name = $('.names .name').text();
                info.english = $('.names .eng-name').text();
                info.original = $('.names .original-name').text();
                info.watchLink = $('.read-first a').attr('href');
                
                if (info.watchLink.startsWith('/')) info.watchLink = 'http://doramatv.ru' + info.watchLink;
                
                tmp = $('.another-names').text();
                if (tmp.length) info.another_names = tmp.trim();
                
                tmp = $('.picture-fotorama img');
                if (tmp.length) {
                    info.img = $(tmp[0]).attr('src')
                }
                
                tmp = $('.elem_genre');
                if (tmp.length) {
                    info.genres = $(tmp).text().split(',').map(g => g.trim());
                }
                let meta = $('.subject-meta');
                
                tmp = meta.find('p:contains("Серий")');
                if (tmp.length) {
                    info.episodes = parseInt(tmp.text().replace('Серий:', '').trim());
                }
                
                tmp = meta.find('p:contains("Полнометражный")');
                if (tmp.length) {
                    info.episodes = 1;
                }
                
                tmp = $('span[itemprop="duration"]');
                if (tmp.length) {
                    info.duration = parseInt(tmp.text());
                }
                
                tmp = meta.find('.elem_year');
                if (tmp.length) {
                    let years = '';
                    $(tmp).each(function() { 
                        years += $(this).text()
                    })
                    info.year = years;
                }
                
                tmp = $('.rating-block').attr('data-score');
                if (tmp) {
                    // Умножаем на 2, потому что оценка по пятибальной шкале, а нужно по десяти
                    info.score = parseFloat(tmp) * 2;
                    info.score = parseFloat(info.score.toFixed(2));
                }
                
                tmp = $('.chapters-link tbody a');
                if (tmp.length) {
                    let links = [];
                    tmp.each(function() {
                        links.push('http://doramatv.ru/' + $(this).attr('href'));
                    })
                    info.links = links;
                }
                
                tmp = $('.manga-description');
                if (tmp.length) {
                    info.description = tmp.text();
                }
                res(info);
            })
        })
    }
    function search(query) {
        // TODO: Сделать проверку жанр:"ааа" здесь!
        // TODO: Вместо params принимать query
        let form = { q: query },
            params = { url: 'http://doramatv.ru/search', formData: form, method: 'POST' };
        
        if (/^жанр:"(.*?)"$/i.test(query)) {
            let genre = query.match(/^жанр:"(.*?)"$/)[1].toLowerCase();

            params = { url: 'http://doramatv.ru/list/genre/' + genres[genre] + '?sortType=rate', method: 'GET'};
        }
        
        return new Promise((res, rej) => {
            request(params, (err, response, body) => {
                if (err) {
                    rej(err);
                }

                let $ = cheerio.load(body),
                    results = [];
                $('.tiles .tile').each(function() {
                    let dorama = {};
                    let link = $(this).find('.img a').attr('href');

                    if (link.startsWith('/') && !/^\/list/.test(link)) {
                        dorama.link = link;
                        dorama.img = $(this).find('.img .lazy').attr('data-original');

                        let tmp = $(this).find('.star-rate .rating');
                        if (tmp.length) {
                            let score = $(tmp).attr('title');
                            score = parseFloat(score);
                            score = parseFloat(score.toFixed(2));
                            dorama.score = score;
                        }

                        dorama.name = $(this).find('h3').text();
                        tmp = $(this).find('h4');
                        if (tmp.length) {
                            dorama.secondName = $(tmp).text();
                        }

                        tmp = $(this).find('.tile-info');
                        if (tmp.length) {
                            dorama.descr = $(tmp).text().trim();

                            let views = dorama.descr.match(/Просмотров: (\d+)/i);
                            if (views) {
                                dorama.views = parseInt(views[1]);
                                dorama.descr = dorama.descr.replace(/Просмотров: (\d+)/i, '').trim();
                            }
                        }

                        results.push(dorama);
                    }
                })
                res(results);
            })
        })
    }
    function getWatch(link) {
        return new Promise((res, rej) => {
            request(link, (err, response, body) => {
                if (err) {
                    rej(err);
                    return;
                }
                
                let $ = cheerio.load(body),
                    tmp,
                    videos = [],
                    episodes = [],
                    ret = {};
                
                $('.chapter-link').each(function() {
                    let video = {};
                    
                    video.additional = $(this).find('.video-info .text-additional').text();
                    video.details = $(this).find('.video-info .details').text().trim();
                    tmp = $(this).find('.embed_video .embed_source').attr('value');
                    if (tmp.length) {
                        tmp = tmp.match(/iframe src=['"](.*?)['"]/);
                        if (tmp) {
                            video.embed = tmp[1];
                            
                            if (video.embed.startsWith('//')) {
                                video.embed = 'http:' + video.embed;
                            }
                            
                        }
                    }
                    
                    videos.push(video);
                })
                
                
                $($('#chapterSelectorSelect')[0]).find('option').each(function() {
                    let ep = {};
                    
                    ep.name = $(this).text();
                    ep.selected = $(this).attr('selected') != null;
                    ep.link = 'http://doramatv.ru' + $(this).attr('value');
                    
                    episodes.push(ep);
                })
                
                
                ret.videos = videos;
                ret.episodes = episodes;
                
                res(ret);
            })
        })
    }
    function updateAllDoramas() {
        DB.find({}).sort({ name: 1 }).exec(function(err, docs) {
            if (err) console.error(err);

            doramasInDB = docs;
        })
    }
    
    function isInDB(dorama) {
        return doramasInDB.find(el => el.name === dorama.name) != null;
    }
    
    Plugin.newPlugin(config, { 
        init: init,
        mount: function(app) {
            // Добавляем пункт "Дорамы" в верхнее меню
            let navBar = app.$children[0].nav
            navBar.splice(-1, 0, { name: 'Дорамы', page: 'dorama-main' });
        },
        demount: function(app) {
            // Убераем пункт "Дорамы" из верхнего меню
            let navBar = app.$children[0].nav,
                itemIndex = navBar.findIndex(el => el.page == 'dorama-main');
            navBar.splice(itemIndex, 1);
        }
    });
}
