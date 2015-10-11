/**
 * @fileoverview Provides layout specific functionality for HTML5 layout.
 * This includes layout specific directives, that are responsible for
 * interaction with the user, alignment of the blocks and texts in them.
 * Also includes layout specification and initialization.
 */


/**
 * Utile object with specific functionality for the layout.
 * @param {!angular.Object} ng AngularJS object.
 * @param {!angular.JQLite} angularElement AngularJS element object.
 * @return {!Object.<function>} Available functions.
 */
var layoutUtils = (function(ng, angularElement) {
  // Create new AngularJS module to add custom directives to.
  var module = ng.module('custom', []);
  var loadedRes = {};
  var preloader = utils.preloader;
  var frequency = 0;

  window.onAdData = function(data, util) {
    initPreloading(data);
    preloader.addCompletionListener(function() {
      loadedRes = preloader.getLoadedImages();
      utils.onAdData(data, util);
    });
    preloader.start();
  };


  /**
   * Controller for using data binding in layout.
   * @param {!angular.Scope} $scope AngularJS layout $scope.
   * @param {!Object} dynamicData Dynamic data from DAB.
   */
  function LayoutController($scope, dynamicData) {
    helpers.LayoutController($scope, dynamicData);

    $scope.classes = getClasses($scope);

    /**
     * Checks aspect ratio of the image. All images with aspect ratio
     * less than 1.2 are considered to be thin.
     * @return {boolean} Whether the image is thin or not.
     */
    $scope.checkThinLogo = function() {
      var im = loadedRes[$scope.design.logoImageUrl];
      return (im !== undefined && im[0].width / im[0].height < 1.2);
    };
  }


  /**
   * Extends utils directives with custom layout specific directives. All
   * directives will be stored in new container "layout".
   * This code allows to use directives from utils inside the layout.
   */
  ng.module('layout', ['utils', module.name]);


  /**
   * Applies animation to the elements when all DOM has loaded.
   * @return {!angular.Directive} Directive definition object.
   */
  module.directive('animation', function() {
    return {
      restrict: 'A',
      link: function(scope) {
        scope.$evalAsync(function() {
          var planeContainer = document.getElementById('plane-container');
          var planeElement = angularElement(planeContainer);
          frequency = parseInt(planeElement.attr('frequency'), 10);

          layoutUtils.tintAndLoadImage('plane-tint',
              scope.design.bgColor.toColor());
          layoutMethods.animationBuild();
        });
      }
    };
  });


  /**
   * Exposes customExtTextFit as a custom attribute.
   * @param {!angular.$timeout} $timeout The Angular timeout service.
   * @return {!angular.Directive} Directive definition object.
   */
  module.directive('customExtTextFit', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, el) {
        $timeout(function() {
          customExtTextFit(el);
        });
      }
    };
  });


  /**
   * Applies text fit to the product price and the product prefix in queue
   * to make them of the same size finally.
   * @param {!angular.JQLite} el The jQuery element object to handle.
   * @param {!angular.Scope} scope AngularJS layout scope.
   */
  function customExtTextFit(el, scope) {
    var minfontsize = el.attr('minfontsize');
    var multiline = el.attr('multiline');
    var truncate = el.attr('truncate');
    var pricePrefixTextFit;
    var originalPrice = el.text().trim();

    var priceTextFit = new ddab.layouts.utils.DynamicTextFit(el[0],
        minfontsize && minfontsize.toNumber(),
        multiline && multiline.toBoolean(),
        truncate && truncate.toBoolean());

    priceTextFit.addEventListener('textfit', function() {
      var scaledFontSize = priceTextFit.getScaledFontSize();
      var isPriceTruncated = priceTextFit.isTruncated();

      // If price is truncated then add "title" attribute to the original
      // element.
      if (isPriceTruncated && !el[0].hasAttribute(DomAttribute.TITLE)) {
        el[0].setAttribute(DomAttribute.TITLE, originalPrice);
      }

      // Make the prefix font size always the same as the product price.
      var prefixFontSize = scaledFontSize - 0;
      var prefixEl = el[0].nextElementSibling;
      var prefixObject = angular.element(prefixEl);

      if (typeof(prefixEl) != 'undefined' && prefixEl != null) {
        var prefixMinFontSize = prefixObject.attr('minfontsize').toNumber();

        // Prevent the prefix font size from becoming smaller than its minimum
        // font size.
        if (prefixFontSize < prefixMinFontSize) {
          prefixEl.style.fontSize = prefixMinFontSize + 'px';
        } else {
          prefixEl.style.fontSize = prefixFontSize + 'px';
        }
        pricePrefixTextFit = new ddab.layouts.utils.DynamicTextFit(prefixEl,
            prefixFontSize, false, true);

        pricePrefixTextFit.addEventListener('textfit', function() {
          var originalPrefixText = prefixObject.text().trim();
          var isPrefixTruncated = pricePrefixTextFit.isTruncated();

          // If price is truncated then add "title" attribute to the original
          // element.
          if (isPrefixTruncated && !prefixEl.hasAttribute(DomAttribute.TITLE)) {
            prefixEl.setAttribute(DomAttribute.TITLE, originalPrefixText);
          }
          helpers.alignText(prefixObject);
        });

        pricePrefixTextFit.scaleText();
      }

      helpers.alignText(el, scaledFontSize);
    });

    priceTextFit.scaleText();
  }


  /**
   * After dynamic text sizing, this makes item font sizes uniform based
   * on the smallest font size.
   * @return {!angular.Directive} Directive definition object.
   */
  module.directive('uniformTextSize', ['$timeout', function($timeout) {
    return {
      restrict: 'A',
      link: function() {
        $timeout(function() {
          var selector = '[uniform-text-size]';
          var smallestFontSize = 1000;
          // Find smallest font size.
          ng.forEach(getElementsList(selector + ' span'),
              function(textFitElement) {
                var elementMinimumFontSize =
                    textFitElement.parentElement.getAttribute('minfontsize');
                var elementFontSize = parseInt(
                    helpers.getStyleProperty(textFitElement, 'font-size'));
                if (elementFontSize < elementMinimumFontSize) {
                  elementFontSize = elementMinimumFontSize;
                }
                if (elementFontSize < smallestFontSize) {
                  smallestFontSize = elementFontSize;
                }
              });

          // Make uniform.
          ng.forEach(getElementsList(selector), function(listElement) {
            var ngSpan = ng.element(listElement.querySelector('span'));
            ng.element(listElement).css('font-size', smallestFontSize + 'px');
            ngSpan.css('font-size', smallestFontSize + 'px');
          });
        }, 500);
      }
    };
  }]);


  /**
   * Convenience alias for querySelectorAll that returns results as Array
   * (instead of querySelectorAll's native nodeList.)
   * @param {string} selector A CSS-style selector. ex: "#foo .bar>img"
   * @param {Element=} opt_element Root element to query (document is default).
   * @return {Array.<Element>}
   */
  function getElementsList(selector, opt_element) {
    if (!opt_element) {
      opt_element = document;
    }
    return Array.prototype.slice.call(opt_element.querySelectorAll(selector));
  }


  /**
   * Implements "turbulence" imitation for the plane.
   */
  function doTurbulence() {
    var planeContainer = document.getElementById('plane-container');
    var planeElement = angularElement(planeContainer);
    var originalPosition = parseInt(planeElement.attr('orig_pos'), 10);
    var amplitude = parseInt(planeElement.attr('amplitude'), 10);
    var offset = (Math.sin(frequency) * amplitude);
    var newPosition = originalPosition + offset;
    planeContainer.style.top = newPosition + 'px';
    frequency += .03;
  }


  /**
   * Creates canvas with provided color.
   * @param {string} canvas ID name for the canvas.
   * @param {string} tintColor Color to apply.
   */
  function tintAndLoadImage(canvas, tintColor) {
    var c = document.getElementById(canvas);
    var plane = document.getElementById('plane');
    var ctx = c.getContext('2d');
    var pic = new Image();

    pic.onload = function() {
      c.width = pic.width;
      c.height = pic.height;
      ctx.drawImage(pic, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = tintColor;
      ctx.rect(0, 0, c.width, c.height);
      ctx.fill();
    };

    pic.src = plane.getAttribute('tint');
  }


  /**
   * Creates the list of the CSS classes to apply to the layout content
   * depending on parameters from DAB.
   * @param {!angular.Scope} scope AngularJS layout scope.
   * @return {!Object.<string>} All available CSS classes.
   */
  function getClasses(scope) {
    var design = scope.design;
    var layout = [design['cornerStyle']];
    var btn = [design['btnStyle']];

    if (scope.toBoolean(design['btnShad'])) {
      btn.push('shadow');
    }

    return {
      layout: layout.join(' '),
      button: btn.join(' ')
    };
  }

  return {
    doTurbulence: doTurbulence,
    tintAndLoadImage: tintAndLoadImage,
    LayoutController: LayoutController
  };
})(angular, angular.element);


/**
 * Initialization for the layout.
 */
(function() {
  // Only Flights vertical.
  // meta
  utils.defineMeta('layoutName', 'Flights_SingleItemImgFill_01');
  utils.defineMeta('version', '2.2');

  // attributes
  // required
  utils.defineAttribute('Product', 'url', true);
  utils.defineAttribute('Product', 'name', true);
  utils.defineAttribute('Headline', 'productClickOnly', true);

  // optional
  utils.defineAttribute('Headline', 'pricePrefix', false);
  utils.defineAttribute('Headline', 'cta', false);
  utils.defineAttribute('Headline', 'disclaimer', false);
  utils.defineAttribute('Product', 'price', false);
  utils.defineAttribute('Design', 'bgColor', false);
  utils.defineAttribute('Design', 'btnColor', false);
  utils.defineAttribute('Design', 'btnRollColor', false);
  utils.defineAttribute('Design', 'txtColorPrice', false);
  utils.defineAttribute('Design', 'txtColorPricePrefix', false);
  utils.defineAttribute('Design', 'txtColorProduct', false);
  utils.defineAttribute('Design', 'txtColorCta', false);
  utils.defineAttribute('Design', 'nameSize', false);
  utils.defineAttribute('Design', 'priceSize', false);
  utils.defineAttribute('Design', 'cornerStyle', false);
  utils.defineAttribute('Design', 'btnStyle', false);
  utils.defineAttribute('Design', 'logoImageUrl', false);
  utils.defineAttribute('Design', 'btnShad', false);

  // occurrences
  utils.defineOccurrences('Headline', 1, 1);
  utils.defineOccurrences('Product', 1, 1);
  utils.defineOccurrences('Design', 1, 1);

  window.setup = function() {
    document.getElementById('ad-container').addEventListener('click',
        utils.clickHandler, false);
  };

  window.initPreloading = function(dynamicData) {
    var data = dynamicData.google_template_data.adData[0];
    var products = utils.parse(data, 'Product');
    var design = utils.parse(data, 'Design')[0];
    var preloader = utils.preloader;

    preloader.addImage(design.logoImageUrl);
    preloader.addImage(design.bgImageUrl);
    for (var i = 0; i < products.length; i++) {
      preloader.addImage(products[i].imageUrl);
    }
  };
})();
