// Enable/Disable any personalization by those variable keys
const configurations = {
  load_customizations: true,    // Completely disables all personalizations {true / false}
  
  nginx_section_id: "services", // Target section to apply customizations (need match the id: tag on YAML) {string}
  subdomains_as_name: true,     // Enable using the subdomain of your domain url as a item name {true / false}
  domain_name_filter: [         // Fill this list with your domains to help setting subdomain as name {Array[string]}
    "example.com",
    "internal.example.net",
  ],

  fetch_domain_icons: true,     // Enables icon scraping using the api url set bellow {true / false}
  icon_scraper_api: "https://geticon.dev/?url=", // Icon scraper API url {url}
  
  larger_nginx_section: true,   // It sets the nginx_section_id element to be slightly larger then the rest {true / false}
  proxy_host_layout: "grid",    // It sets the nginx_section_id proxy host list layout between {list, grid, compact-list}
  icon_size: "50px",            // It sets the domain icon size for `list` and `compact-list` layouts {css supported size (px, em, in...)}
}

const debounce_timeout = 100; // Debounce time to wait for changes on the list
const monitor = {  // Main monitor function, watching for changes on body
  /* This function watches constantly the changes on body and at each change
    it ckecks if the nginx section still exists. If nginx section exists, a
    new observer is set on the element.

    This is kind of a overcomplicated function just to watch a sigle item.
    Inittialy, I've created a simple observer directly on the nginx element,
    but on a dashboard with multiple pages, all items are reacreated during
    each page changed and the observer gets deleted along with it. So it was
    necessary to monitor the entire body for changes and made it restart the
    observer if it gets lost.
  */
  observador: null,
  iniciar() {
    if (!this.observador) {
      this.observador = new MutationObserver((mutations) => {
        // Verifica se o elemento existe na tela atual
        const elementoAtual = document.querySelector("#" + configurations.nginx_section_id);
        if (!elementoAtual) return;

        const mudouAlgoNoAlvo = mutations.some((m) => 
            elementoAtual.contains(m.target) || m.target.contains(elementoAtual)
        );

        mudouAlgoNoAlvo && callback();
      });
    }

    // Observa o body inteiro por mudanças
    this.observador.observe(document.body, {
      childList: true, characterData: true, subtree: true
    });
  },

  pausar() {
    if (this.observador) {
      this.observador.disconnect();
    }
  },
};

/* The main callback for the nginx observer, it waits some debounce time after the last
change repported on the nginx section, if nothing happens after the debound time it calls
the function to alter the structure of the proxy items
*/
const callback = () => {
    //Reseta o contador de espera as mudanças pararem
    clearTimeout(window.phc_cooldown)


    // Redefine o contador que espera as mudanças pararem
    window.phc_cooldown = setTimeout(() => {
        monitor.pausar()
        processarMudancaFinal()
    }, debounce_timeout);
};

/* This function starts the changing process, it sets wich items are going to be changend
and waits for all items to load if the list was not fully loaded yet.
  When it notices the list was finally presented it calls the real change function
*/
async function processarMudancaFinal() { console.log("Atualizando lista de proxies")
    // Código pra ser executado toda vez que os proxy hosts forem atualzados
    const nginx_section = document.getElementById(configurations.nginx_section_id)
    const proxies_item  = nginx_section.querySelector("#services > div > div:nth-child(3) > div")
    var   proxies_list  = proxies_item.children
    
    while (proxies_list.length <= 1) {
      await new Promise(r => setTimeout(r, 250)); //Sleep for 250ms waiting the api to properly load
      proxies_list = proxies_item.children //Force updating children items list
    }

    process_proxy_block(proxies_list)

    if (configurations.larger_nginx_section) nginx_section.classList.add("nginx-section")

    if (!["grid", "compact-list"].includes(configurations.proxy_host_layout)) return

    proxies_item.classList.add("proxy-hosts-grid-list")
    configurations.proxy_host_layout === "compact-list" && proxies_item.style
      .setProperty("grid-template-columns", "repeat(auto-fill, minmax(150px, 1fr))")
}

/* This is the final function, it start looping through all items inside the proxies list
and alters the "name" field, filtering your domain out of it. For exemmple:

      A proxy entry with:                 "subdomain.example-domain.com"
      With a domain_name_filter set to:   "example-domain.com"
      Will return the following name:     "subdomain"
(if no domain list is set, this script will split the domain by "." and use the first match)

  And the final part of this function uses a custom API to fetch icons for your proxy hosts
by default, I suggest the "https://geticon.dev" API, the API was able to fetch a good amount
of icons for my proxy domains and it sets a placeholder icon displaying the fist letter of
the urls it couldn't find. And when the API fails to fetch anything, a placeholder icon is set.
The icon was extracted from "https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/server-network.svg".
*/
async function process_proxy_block(div_node) {
  const placeholderSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000aa"><path d="M13,19H14A1,1 0 0,1 15,20H22V22H15A1,1 0 0,1 14,23H10A1,1 0 0,1 9,22H2V20H9A1,1 0 0,1 10,19H11V17H4A1,1 0 0,1 3,16V12A1,1 0 0,1 4,11H20A1,1 0 0,1 21,12V16A1,1 0 0,1 20,17H13V19M4,3H20A1,1 0 0,1 21,4V8A1,1 0 0,1 20,9H4A1,1 0 0,1 3,8V4A1,1 0 0,1 4,3M9,7H10V5H9V7M9,15H10V13H9V15M5,5V7H7V5H5M5,13V15H7V13H5Z"/></svg>'
  const not_found = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

  for (let item of div_node) {
    const name_it = item.querySelector("[data-custom_name_shift=true]") || item.firstChild, nametxt = name_it.innerHTML
    const icon_lk = configurations.icon_scraper_api !== "" ? configurations.icon_scraper_api + encodeURIComponent(item.href) : null
    const item_ic = item.querySelector("[data-custom_img_loaded=true]") || document.createElement("img")
    
    // Adding a custom css to structure all of the items
    switch (configurations.proxy_host_layout) {
      case "grid":
        item.classList.add("proxy-hosts-grid-item")
      break
      
      default:
        item_ic.style.width = configurations.icon_size
      break
    }

    name_it.dataset.custom_name_shift = true
    item_ic.dataset.custom_img_loaded = true
    item_ic.setAttribute("src", icon_lk)
    item_ic.setAttribute("onerror", `this.setAttribute("src", "${not_found}")`)

    if (configurations.subdomains_as_name) { let new_nametxt
      const captalize_first_letter = nametxt.charAt(0).toUpperCase() + nametxt.slice(1)

      if (configurations.domain_name_filter.length > 0){
        new_nametxt = captalize_first_letter
          .replace(configurations.domain_name_filter.find(domain => nametxt.includes(domain)), "")
          .replaceAll(".", "")
      } else new_nametxt = captalize_first_letter.split(".")[0]
      
      if (["grid", "compact-list"].includes(configurations.proxy_host_layout)) {
        name_it.innerHTML = new_nametxt.length < 11 ?
          new_nametxt : new_nametxt.slice(0, 11) + "..."
      }
    }

    configurations.fetch_domain_icons && item.insertBefore(item_ic, item.firstChild)
  } monitor.iniciar()
}

// Starts the document.body monitor
configurations.load_customizations && monitor.iniciar()