import scrollama from 'scrollama';

export function setupSectionScroll(rootSelector = '.section'): () => void {
  const scroller = scrollama();

  scroller
    .setup({
      step: rootSelector,
      offset: 0.6,
      progress: false
    })
    .onStepEnter(({ element }) => {
      element.classList.add('is-active');
    })
    .onStepExit(({ element }) => {
      element.classList.remove('is-active');
    });

  const onResize = () => scroller.resize();
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    scroller.destroy();
  };
}

export function setupSteps(
  stepSelector: string,
  onEnter: (sceneId: string, element: HTMLElement) => void
): () => void {
  const scroller = scrollama();
  const initialStep = document.querySelector<HTMLElement>(stepSelector);
  const initialScene = initialStep?.dataset.scene;

  if (initialStep && initialScene) {
    initialStep.classList.add('is-step-active');
    onEnter(initialScene, initialStep);
  }

  scroller
    .setup({
      step: stepSelector,
      offset: 0.7,
      progress: false
    })
    .onStepEnter(({ element }) => {
      element.classList.add('is-step-active');
      const scene = (element as HTMLElement).dataset.scene;
      if (scene) onEnter(scene, element as HTMLElement);
    })
    .onStepExit(({ element }) => {
      element.classList.remove('is-step-active');
    });

  const onResize = () => scroller.resize();
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    scroller.destroy();
  };
}
