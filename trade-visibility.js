/* Remove only the obsolete standalone Couverture trade. Keep Isolation et sous-couverture. */
(() => {
  delete trades.couverture;

  document.querySelectorAll('#tradeGrid .trade, #stromTradeGrid .trade').forEach(card => {
    if (card.dataset.tradeKey === 'couverture') card.remove();
  });
})();
