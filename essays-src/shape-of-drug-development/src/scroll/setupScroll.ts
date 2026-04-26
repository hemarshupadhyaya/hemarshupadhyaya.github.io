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
