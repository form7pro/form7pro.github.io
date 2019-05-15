export
function animate($observer, rootConfig, animationConfigs, $catchers) {
	if (! ('IntersectionObserver' in window)) {
		return
	}

	const duration = 1000

	const animations = []

	const initAnimation = ($el, config) => {
		if (! ('animate' in $el)) {
			return
		}
		const animation = $el.animate(config.keyframes, { ...{ fill: 'forwards' }, ...config.options, duration })
		animation.pause()
		animations.push(animation)
	}

	for (const config of animationConfigs) {
		if (config.$el instanceof NodeList) {
			for (const $el of config.$el) {
				initAnimation($el, config)
			}
		} else {
			initAnimation(config.$el, config)
		}
	}

	let lastKnownScrollPosition = 0
	let ticking = false

	const elPosition = {}
	const elScrollPosition = {}

	const handleScroll = scrollPos => {
		let animPosition = ((scrollPos - elScrollPosition.min) / elScrollPosition.height) * duration

		if (animPosition < 0) {
			animPosition = 0
		} else if (animPosition > duration) {
			animPosition = duration
		}

		for (let i = 0; i < animations.length; i++) {
			animations[ i ].currentTime = animPosition
		}
	}

	const onScroll = e => {
		lastKnownScrollPosition = window.scrollY

		if (!ticking) {
			window.requestAnimationFrame(() => {
				handleScroll(lastKnownScrollPosition)
				ticking = false
			});

			ticking = true
		}
	}

	const setPositions = entry => {
		elPosition.boundingClientRect = entry.boundingClientRect
		elPosition.rootBounds = entry.rootBounds
		elPosition.offsetTop = entry.target.offsetTop

		elScrollPosition.min = elPosition.offsetTop - elPosition.rootBounds.height - elPosition.rootBounds.top
		elScrollPosition.max = elPosition.offsetTop + elPosition.boundingClientRect.height - elPosition.rootBounds.top
		elScrollPosition.height = elPosition.rootBounds.height + elPosition.boundingClientRect.height
	}

	let intersectionObserverRan = false

	const intersectionObserver = new IntersectionObserver(entries => {
		const observer = entries.find(entry => entry.target === $observer)

		if (observer) {
			if (!intersectionObserverRan) {
				intersectionObserverRan = true
				setPositions(observer)
				handleScroll(window.pageYOffset)
			}

			if (observer.isIntersecting) {
				setPositions(observer)
				window.addEventListener('scroll', onScroll, { passive: true })
			} else {
				window.removeEventListener('scroll', onScroll)
			}
		} else {
			if (intersectionObserverRan) {
				handleScroll(window.pageYOffset)
			}
		}

	}, rootConfig)

	intersectionObserver.observe($observer)

	if ($catchers) {
		$catchers.forEach($catcher => intersectionObserver.observe($catcher))
	}
}

export
function heroSlide(contents, $transition, pause) {
	let active = 0

	const handleAnimation = content => new Promise(resolve => {
		const $clip = $transition.querySelector('.HeroTransition-Clip')

		if (content._prepared) {
			delete content._prepared
			$transition.classList.remove('HeroTransition_prepare')
		} else {
			const $clip = $transition.querySelector('.HeroTransition-Clip')
			$clip.insertAdjacentHTML('afterend', content.html)
		}

		$transition.classList.add('HeroTransition_start')


		$clip.addEventListener('animationend', e => {
			if (e.target === $clip) {
				$transition.classList.remove('HeroTransition_start')
				$clip.parentNode.removeChild($clip)

				resolve()
			}
		})
	})

	const prepare = content => new Promise(resolve => {
		$transition.classList.add('HeroTransition_prepare')

		const $hero = $transition.querySelector('.HeroTransition-Clip')
		$hero.insertAdjacentHTML('afterend', content.html)

		const $img = $transition.querySelector('.HeroTransition-Clip:nth-child(2) .HeroSection-Picture img')

		content._prepared = true

		return $img.onload = function () {
			content.loaded = true
			return resolve()
		}
	})

	const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

	let _willStop = true
	let _realStop = true

	const stop = () => {
		_willStop = true
	}

	const start = () => {
		_willStop = false

		if (_realStop) {
			_realStop = false
			next()
		}
	}

	async function next() {
		const nextActive = (active + 1) % contents.length
		const content = contents[nextActive]

		if (! content.loaded) {
			const startTs = (new Date()).getTime()
			await prepare(content)
			const endTs = (new Date()).getTime()

			const toSleep = endTs - startTs + pause

			if (toSleep > 0) {
				await sleep(toSleep)
			}
		} else {
			await sleep(pause)
		}

		await handleAnimation(content)

		active = nextActive

		if(_willStop) {
			_realStop = true
			return
		}

		return next()
	}

	if ('IntersectionObserver' in window) {
		const $observer = $transition

		const rootConfig = {
			root: null,
			rootMargin: "-20% 0px -20%"
		}

		const intersectionObserver = new IntersectionObserver(entries => {
			const observer = entries[0]

			if (observer.isIntersecting) {
				start()
			} else {
				stop()
			}
		}, rootConfig)

		intersectionObserver.observe($observer)

	} else {
		start()
	}

	return { stop, start }
}