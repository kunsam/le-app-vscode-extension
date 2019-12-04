import { isNumber, isString } from "lodash";

export default class WorktileCommandUtil {
  /**
   * 静态映射
   *
   * @static
   * @param {((string | number)[])} pathnames
   * @returns {((string | number)[])}
   * @memberof WorktileCommandUtil
   */
  static routerParamsMap(pathnames: (string | number)[]): (string | number)[] {
    if (pathnames.length <= 1) return pathnames;

    // /collections/:id
    // /collections/:id/products/:product_id
    if (pathnames[0] === "collections" && isNumber(pathnames[1])) {
      let pathnames = ["collections", ":id"];
      if (pathnames[3] && pathnames[3] === "products") {
        if (isNumber(pathnames[4])) {
          pathnames.push("products");
          pathnames.push(":product_id");
        }
      }
      return pathnames;
    }

    // /products/:product_id
    if (pathnames[0] === "products" && isNumber(pathnames[1])) {
      let pathnames = ["products", ":product_id"];
      return pathnames;
    }

    // /products/middleware/:product_id
    if (
      pathnames[0] === "products" &&
      pathnames[1] === "middleware" &&
      isNumber(pathnames[2])
    ) {
      let pathnames = ["products", "middleware", ":product_id"];
      return pathnames;
    }
    // /rating_product/:tote_product_id
    if (pathnames[0] === "rating_product" && isNumber(pathnames[1])) {
      let pathnames = ["rating_product", ":tote_product_id"];
      return pathnames;
    }
    // /purchase_product/:tote_product_id
    if (pathnames[0] === "purchase_product" && isNumber(pathnames[1])) {
      let pathnames = ["purchase_product", ":tote_product_id"];
      return pathnames;
    }

    // collection_products/:id
    if (pathnames[0] === "collection_products" && isNumber(pathnames[1])) {
      let pathnames = ["collection_products", ":id"];
      return pathnames;
    }

    // share_photo/:id/:product_id/:tote_id
    if (
      pathnames[0] === "share_photo" &&
      isNumber(pathnames[1]) &&
      isNumber(pathnames[2]) &&
      isNumber(pathnames[3])
    ) {
      let pathnames = ["share_photo", ":id", ":product_id", ":tote_id"];
      return pathnames;
    }

    // share_photos_finished/:id/:product_id/:tote_id
    if (
      pathnames[0] === "share_photos_finished" &&
      isNumber(pathnames[1]) &&
      isNumber(pathnames[2]) &&
      isNumber(pathnames[3])
    ) {
      let pathnames = [
        "share_photos_finished",
        ":id",
        ":product_id",
        ":tote_id"
      ];
      return pathnames;
    }

    // /occasion/:slug
    if (pathnames[0] === "occasion" && isString(pathnames[1])) {
      let pathnames = ["occasion", ":slug"];
      return pathnames;
    }

    // /about_us/:about
    if (pathnames[0] === "about_us" && isString(pathnames[1])) {
      let pathnames = ["about_us", ":about"];
      return pathnames;
    }
    // /select_size/:type
    if (pathnames[0] === "select_size" && isString(pathnames[1])) {
      let pathnames = ["select_size", ":type"];
      return pathnames;
    }
    // /promo_code/:status
    if (pathnames[0] === "promo_code" && isString(pathnames[1])) {
      let pathnames = ["promo_code", ":status"];
      return pathnames;
    }
    // /brands/:id
    if (pathnames[0] === "brands" && isNumber(pathnames[1])) {
      let pathnames = ["brands", ":id"];
      return pathnames;
    }
    // /filterTerms/:type/filterTerm/:filterTerm
    if (
      pathnames[0] === "filterTerms" &&
      isNumber(pathnames[1]) &&
      pathnames[2] === "filterTerm" &&
      isString(pathnames[3])
    ) {
      let pathnames = ["filterTerms", ":type", "filterTerm", ":filterTerm"];
      return pathnames;
    }
    // /brands/:id
    if (pathnames[0] === "brands" && isNumber(pathnames[1])) {
      let pathnames = ["brands", ":id"];
      return pathnames;
    }
    return pathnames;
  }
}
