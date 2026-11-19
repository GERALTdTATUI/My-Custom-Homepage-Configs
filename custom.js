const icon_scraper_api = `https://geticon.dev/?url=` //Set a custom icon_scraper api to fetch your host icons

//This is used to polish your proxy hosts view, it uses the subdomain inside your proxy url as the item name
const domain_name_filter = [
  "example.com",
  "internal.example.net",
]

// id of the section where your proxy hosts are fetched and listed
const services_api_list_id = '#services'
const TEMPO_ESPERA_MS = 100; // Debounce time to wait for changes on the list
const monitor = { observador: null, // Main monitor function, watching for changes on body
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
  
  iniciar() {
    if (!this.observador) {
      this.observador = new MutationObserver((mutations) => {
        // Verifica se o elemento existe na tela atual
        const elementoAtual = document.querySelector(services_api_list_id);
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
    }, TEMPO_ESPERA_MS);
};

/* This function starts the changing process, it sets wich items are going to be changend
and waits for all items to load if the list was not fully loaded yet.
  When it notices the list was finally presented it calls the real change function
*/
async function processarMudancaFinal() { console.log("Atualizando lista de proxies")
    // Código pra ser executado toda vez que os proxy hosts forem atualzados
    const proxies_item = document.querySelector("#services > div > div:nth-child(3) > div")
    var   proxies_list = proxies_item.children
    
    while (proxies_list.length <= 1) {
      await new Promise(r => setTimeout(r, 250)); //Sleep for 250ms waiting the api to properly load
      proxies_list = proxies_item.children //Force updating children items list
    }

    process_proxy_block(proxies_list)
    
    // Adding a custom css to structure all of the items
    // proxies_item.classList.add("test-proxy-hosts-list")    
}

/* This is the final function, it start looping through all items inside the proxies list
and alters the "name" field, filtering your domain out of it. For exemmple:

      A proxy entry with:                 "subdomain.example-domain.com"
      With a domain_name_filter set to:   "example-domain.com"
      Will return the following name:     "subdomain"

  And the final part of this function uses a custom API to fetch icons for your proxy hosts
by default, I suggest the "https://geticon.dev" API, the API was able to fetch a good amount
of icons for mys proxy domains and it sets a placeholder icon displaying the fist letter of
the urls it couldn't find. And when the API fails to fetch anything, a placeholder icon is set.
The icon was extracted from "https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/server-network.svg".
*/
async function process_proxy_block(div_node) {
  const placeholderSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000aa"><path d="M13,19H14A1,1 0 0,1 15,20H22V22H15A1,1 0 0,1 14,23H10A1,1 0 0,1 9,22H2V20H9A1,1 0 0,1 10,19H11V17H4A1,1 0 0,1 3,16V12A1,1 0 0,1 4,11H20A1,1 0 0,1 21,12V16A1,1 0 0,1 20,17H13V19M4,3H20A1,1 0 0,1 21,4V8A1,1 0 0,1 20,9H4A1,1 0 0,1 3,8V4A1,1 0 0,1 4,3M9,7H10V5H9V7M9,15H10V13H9V15M5,5V7H7V5H5M5,13V15H7V13H5Z"/></svg>'
  const not_found = `data:image/svg+xml;utf8,${encodeURIComponent(placeholderSvg)}`;

  for (let item of div_node) {
    const name_it = item.querySelector("[data-custom_name_shift=true]") || item.firstChild, nametxt = name_it.innerHTML
    const item_ic = item.querySelector("[data-custom_img_loaded=true]") || document.createElement("img")

    name_it.dataset.custom_name_shift = true
    item_ic.dataset.custom_img_loaded = true
    item_ic.setAttribute("src", icon_scraper_api + item.href)
    item_ic.setAttribute("onerror", `this.setAttribute("src", "${not_found}")`)
    
    const new_nametxt = nametxt.charAt(0).toUpperCase() + nametxt.slice(1)
      .replace(domain_name_filter.find(domain => nametxt.includes(domain)), "")
      .replaceAll(".", "")

    name_it.innerHTML = new_nametxt.length < 11 ?
      new_nametxt : new_nametxt.slice(0, 11) + "..."

    item.insertBefore(item_ic, item.firstChild)
  } monitor.iniciar()
}

// Starts the document.body monitor
monitor.iniciar()