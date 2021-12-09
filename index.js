const { SENTRY_DSN, ENABLE_ANALYTICS } = process.env;

const
	GPlay = require('google-play-scraper').memoized(),
	Analytics = ENABLE_ANALYTICS === '1' ? require('anonymous-analytics') : undefined;

const fastify = require('fastify')();

const searchAnalytics = Analytics ? new Analytics('search') : undefined;

if(SENTRY_DSN) fastify.register(require('fastify-sentry'), { dsn: SENTRY_DSN });
fastify.register(require('fastify-static'), { root: require('path').join(__dirname, 'public') });
fastify.get('/categories', async (request, reply) => reply.send((await GPlay.categories()).sort()));
fastify.post('/search', async (request, reply) => {
	if(searchAnalytics) searchAnalytics.addFromFastify(request).catch(console.log);
	const res = await GPlay.search({ term: request.body.name, num: request.body.number, price: request.body.price });
	for(let i = 0; i < res.length; i++){
		Object.assign(res[i], {
			index: i,
			... (await GPlay.app({ appId: res[i].appId })),
			... { permissions: (await GPlay.permissions({ appId: res[i].appId })) }
		});
	}
	reply.send(res);
});
if(searchAnalytics) fastify.get('/stats', async (request, reply) => reply.send(await searchAnalytics.getStats(undefined, undefined, true)));
fastify.listen(3030).then(() => console.log('Server running'));
