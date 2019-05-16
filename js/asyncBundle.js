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