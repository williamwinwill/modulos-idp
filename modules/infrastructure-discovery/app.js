
    (() => {
      const root = document.getElementById("atlas-discovery-mock");
      const search = root.querySelector("#resource-search");
      const rows = [...root.querySelectorAll("#resource-rows tr")];
      const regionFilter = root.querySelector("#filter-region");
      const catalogFilter = root.querySelector("#filter-catalog");
      const panel = root.querySelector("#detail-panel");
      const modal = root.querySelector("#adoption-modal");
      const detailName = root.querySelector("#detail-name");
      const detailSub = root.querySelector("#detail-sub");
      const detailClass = root.querySelector("#detail-class");
      const resultCount = root.querySelector("#result-count");
      const pageNames = ["overview", "inventory", "resource-detail", "coverage", "findings", "drift", "adoption", "sources"];
      const views = Object.fromEntries(pageNames.map(name => [name, root.querySelector(`#${name}-view`)]));
      let activeClass = null;
      let selectedResourceId = "payments";
      function badgeClass(value) {
        if (value === "Atlas") return "badge b-atlas";
        if (value === "Ownership Conflict") return "badge b-conflict";
        if (value === "External Terraform") return "badge b-ext";
        if (value === "Manual") return "badge b-manual";
        return "badge b-hybrid";
      }
      function filterRows() {
        const q = search.value.trim().toLowerCase();
        let visible = 0;
        rows.forEach((row) => {
          const matchesSearch = row.dataset.name.includes(q);
          const matchesClass = !activeClass || row.dataset.class === activeClass;
          const matchesRegion = !regionFilter.value || row.dataset.region === regionFilter.value;
          const matchesCatalog = !catalogFilter.value || row.dataset.catalog === catalogFilter.value;
          const match = matchesSearch && matchesClass && matchesRegion && matchesCatalog;
          row.classList.toggle("hidden-row", !match);
          row.setAttribute("aria-hidden", String(!match));
          if (match) visible += 1;
        });
        resultCount.textContent = `· ${activeClass || "todas as classes"} · ${visible} recursos`;
      }
      root.querySelectorAll(".class-tile").forEach((tile) => tile.addEventListener("click", () => {
        root.querySelectorAll(".class-tile").forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-pressed", "false"); });
        tile.classList.add("active");
        tile.setAttribute("aria-pressed", "true");
        activeClass = tile.dataset.class;
        filterRows();
      }));
      search.addEventListener("input", filterRows);
      regionFilter.addEventListener("change", filterRows);
      catalogFilter.addEventListener("change", filterRows);
      rows.forEach((row) => row.addEventListener("click", () => {
        rows.forEach((item) => item.classList.remove("selected"));
        row.classList.add("selected");
        selectedResourceId = row.dataset.id;
        const names = {
          payments: ["payments-api-prod", "Lambda · us-east-1 · conta prod-payments", "Hybrid", ["Atlas · tag `originBy`", "Terraform · Atlas", "GitHub Actions", "GitHub Actions", "Time Payments"], ["IAM role · payments-api-role|Atlas", "Lambda · função + alias|Pipeline", "CloudWatch · log group|Atlas"], "Component · payments/payments-api"],
          orders: ["orders-worker", "ECS service · us-east-1 · conta prod-orders", "Hybrid", ["Pipeline · evento recente", "Terraform · state orders-prod", "Deploy pipeline", "GitHub Actions", "Time Orders"], ["ECS service + task definition|Hybrid", "Execution role|Terraform", "Container image|Pipeline"], "Component · orders/orders-worker"],
          edge: ["edge-public-api", "API Gateway · us-east-1 · conta platform", "Hybrid", ["CloudFormation · stack platform-edge", "CloudFormation", "Deploy pipeline", "GitHub Actions", "Time Platform"], ["API + stage|Other IaC", "Integration · Lambda|Pipeline", "Custom domain|Other IaC"], "Sem entidade Backstage"],
          ledger: ["customer-ledger", "DynamoDB · us-east-1 · conta prod-finance", "External Terraform", ["State externo · workspace finance-prod", "Terraform externo", "Terraform externo", "Pipeline de release", "Time Finance"], ["DynamoDB table|External TF", "KMS key|External TF", "Backup policy|External TF"], "Resource · finance/customer-ledger"],
          legacy: ["legacy-batch-runner", "EC2 · us-east-1 · conta data-prod", "Manual", ["CloudTrail · console AWS", "Console AWS", "Console AWS", "Sem fonte conectada", "Owner não confirmado"], ["EC2 instance|Manual", "EBS volume|Manual", "Security group|Manual"], "Sem entidade Backstage"],
          network: ["shared-network", "VPC · us-east-1 · conta shared-prod", "Ownership Conflict", ["`originBy: Atlas` + state externo", "Atlas ↔ Terraform externo", "Atlas", "Sem evidência recente", "Time Platform · revisar"], ["VPC · vpc-0c3a…|Conflict", "Subnets|Atlas", "Route table|External TF"], "Resource · platform/shared-network · conflito"],
          media: ["media-transform", "Lambda · us-east-1 · conta prod-assets", "Hybrid", ["Tag `originBy: Atlas`", "Terraform · Atlas", "GitHub Actions", "GitHub Actions", "Time Assets"], ["IAM role · media-transform-role|Atlas", "Lambda · função + alias|Pipeline", "CloudWatch · log group|Atlas"], "Sem entidade Backstage"]
        };
        const selected = names[row.dataset.id];
        detailName.textContent = selected[0];
        detailSub.textContent = selected[1];
        detailClass.className = badgeClass(selected[2]);
        detailClass.textContent = selected[2];
        const layerValues = [...root.querySelectorAll(".layer-value")].slice(0, 5);
        selected[3].forEach((value, index) => { layerValues[index].innerHTML = `<strong>${value}</strong><span class="ev">Evidência disponível nesta fonte conectada</span>`; });
        root.querySelector(".component-list").innerHTML = selected[4].map((value) => {
          const [label, category] = value.split("|");
          const kind = category === "Atlas" ? "Atlas" : category === "Pipeline" ? "Pipeline" : category.includes("Conflict") ? "Conflict" : category === "Hybrid" ? "Hybrid" : category === "Manual" ? "Manual" : "External Terraform";
          return `<div class="component"><span>${label}</span><span class="${badgeClass(kind)}">${category}</span></div>`;
        }).join("");
        root.querySelectorAll(".layer-value")[5].innerHTML = `<div class="catalog"><i class="catalog-mark">B</i><span>${selected[5]}</span></div>`;
        navigate("resource-detail");
      }));
      rows.forEach((row) => row.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); row.click(); }
      }));
      root.querySelector("#adopt-btn").addEventListener("click", () => navigate("adoption"));
      root.querySelector("#adopt-view-btn").addEventListener("click", () => modal.classList.add("open"));
      root.querySelector("#cancel-modal").addEventListener("click", () => modal.classList.remove("open"));
      root.querySelector("#continue-modal").addEventListener("click", (event) => {
        event.currentTarget.textContent = "Escopo preparado ✓";
        event.currentTarget.disabled = true;
      });
      modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.remove("open"); });
      root.querySelector("#run-discovery").addEventListener("click", (event) => {
        const button = event.currentTarget;
        button.textContent = "Discovery em execução…";
        window.setTimeout(() => { button.textContent = "✓ Scan concluído"; }, 1100);
      });
      const navButtons = [...root.querySelectorAll("[data-view-target]")];
      function showView(name) {
        if (!views[name]) name = "overview";
        Object.entries(views).forEach(([key, view]) => { view.hidden = key !== name; });
        navButtons.forEach((button) => { const active = button.dataset.viewTarget === name; button.classList.toggle("active", active); if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); });
      }
      function navigate(name) {
        if (!views[name]) return;
        showView(name);
        if (location.hash !== `#${name}`) location.hash = name;
      }
      navButtons.forEach((button) => button.addEventListener("click", () => navigate(button.dataset.viewTarget)));
      root.querySelectorAll("[data-route]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); navigate(link.dataset.route); }));
      function viewFromHash() { const name = location.hash.slice(1); showView(views[name] ? name : "overview"); }
      window.addEventListener("hashchange", viewFromHash);
      viewFromHash();
      root.querySelector("#open-drift-from-resource").addEventListener("click", () => {
        root.querySelector("#drift-repo").value = "platform/iac-services";
        populateDriftEnvironments("PROD", "micro", "payments-api-prod");
        setDriftScope();
        showDriftTab("exec");
        navigate("drift");
      });

      const inventory = {
        "platform/iac-core": { HINT: { S3: ["assets-hint", "logs-hint"] }, DEV: { S3: ["assets-dev"] }, PROD: { S3: ["assets-prod"] } },
        "platform/iac-data": { HINT: { rds: ["banco-x", "banco-y-sem-baseline"] }, HEXT: { micro: ["checkout", "catalogo"] }, DEV: { rds: ["banco-dev"] }, PROD: { rds: ["banco-prod", "banco-analytics"] } },
        "platform/iac-services": { HEXT: { micro: ["checkout", "catalogo"] }, DEV: { micro: ["api-dev"] }, PROD: { micro: ["payments-api-prod"] } }
      };
      let driftSerial = 1842;
      let scheduleTarget = null;
      let proposedCron = null;
      function optionsFor(select, values, selectedValue) {
        select.replaceChildren(...values.map((value) => {
          const option = document.createElement("option");
          const id = typeof value === "string" ? value : value.value;
          option.value = id;
          option.textContent = typeof value === "string" && value === "banco-y-sem-baseline" ? "banco-y · baseline indisponível" : id;
          option.selected = id === selectedValue;
          return option;
        }));
      }
      function populateDriftEnvironments(preferredEnv, preferredGroup, preferredResource) {
        const repo = root.querySelector("#drift-repo").value;
        const envs = Object.keys(inventory[repo]);
        const env = envs.includes(preferredEnv) ? preferredEnv : envs[0];
        optionsFor(root.querySelector("#drift-env"), envs, env);
        populateDriftGroups(preferredGroup, preferredResource);
      }
      function populateDriftGroups(preferredGroup, preferredResource) {
        const groups = Object.keys(inventory[root.querySelector("#drift-repo").value][root.querySelector("#drift-env").value]);
        const group = groups.includes(preferredGroup) ? preferredGroup : groups[0];
        optionsFor(root.querySelector("#drift-group"), groups, group);
        const resources = inventory[root.querySelector("#drift-repo").value][root.querySelector("#drift-env").value][group];
        optionsFor(root.querySelector("#drift-resource"), resources, resources.includes(preferredResource) ? preferredResource : resources[0]);
        setDriftScope();
      }
      function selectedLabel(selector) { return selector.options[selector.selectedIndex]?.textContent || ""; }
      function driftPath() {
        const scope = root.querySelector("#drift-scope").value;
        const parts = [selectedLabel(root.querySelector("#drift-repo")).replace("platform/", "")];
        if (scope !== "repo") parts.push(root.querySelector("#drift-env").value);
        if (scope === "group" || scope === "resource") parts.push(root.querySelector("#drift-group").value);
        if (scope === "resource") parts.push(selectedLabel(root.querySelector("#drift-resource")));
        return parts.join(" › ");
      }
      function setDriftScope() {
        const scope = root.querySelector("#drift-scope").value;
        root.querySelector("#drift-env-wrap").hidden = scope === "repo";
        root.querySelector("#drift-group-wrap").hidden = !["group", "resource"].includes(scope);
        root.querySelector("#drift-resource-wrap").hidden = scope !== "resource";
        root.querySelector("#drift-scope-path").textContent = driftPath();
        const repo = root.querySelector("#drift-repo").value;
        const hybrid = repo === "platform/iac-services";
        root.querySelector("#drift-infra-owner").textContent = repo === "platform/iac-core" ? "Terraform · Atlas" : repo === "platform/iac-data" ? "Terraform · externo" : "Terraform · Atlas (role/base)";
        root.querySelector("#drift-delivery-owner").textContent = hybrid ? "GitHub Actions · excluído do plan" : "Camada de delivery não mapeada";
        root.querySelector("#drift-baseline-ref").textContent = repo === "platform/iac-core" ? "workflow · state atlas-core" : repo === "platform/iac-data" ? "workflow GitHub · backend do repo" : "workflow GitHub · state atlas-services";
        const unavailable = scope === "resource" && root.querySelector("#drift-resource").value === "banco-y-sem-baseline";
        root.querySelector("#drift-baseline-badge").textContent = unavailable ? "Baseline indisponível" : "Baseline carregado pelo workflow";
        root.querySelector("#drift-baseline-badge").className = unavailable ? "badge b-conflict" : "badge b-atlas";
        root.querySelector("#drift-no-baseline-note").hidden = !unavailable;
        root.querySelector("#drift-boundary-note").hidden = unavailable || !hybrid;
        root.querySelector("#drift-scope-path").textContent = driftPath();
      }
      const driftRepo = root.querySelector("#drift-repo");
      driftRepo.addEventListener("change", () => populateDriftEnvironments());
      root.querySelector("#drift-env").addEventListener("change", () => populateDriftGroups());
      root.querySelector("#drift-group").addEventListener("change", () => {
        const vals = inventory[driftRepo.value][root.querySelector("#drift-env").value][root.querySelector("#drift-group").value];
        optionsFor(root.querySelector("#drift-resource"), vals);
        setDriftScope();
      });
      root.querySelector("#drift-resource").addEventListener("change", setDriftScope);
      root.querySelector("#drift-scope").addEventListener("change", setDriftScope);
      root.querySelector("#drift-env").addEventListener("change", setDriftScope);
      populateDriftEnvironments("PROD", "micro", "payments-api-prod");
      driftRepo.value = "platform/iac-data";
      populateDriftEnvironments("HINT", "rds", "banco-x");
      root.querySelector("#drift-scope").value = "resource";
      setDriftScope();

      function showDriftTab(name) {
        ["exec", "history", "schedules"].forEach((tab) => {
          const active = tab === name;
          root.querySelector(`#drift-tab-${tab}`).setAttribute("aria-selected", String(active));
          root.querySelector(`#drift-panel-${tab}`).hidden = !active;
        });
      }
      root.querySelectorAll("[data-drift-tab]").forEach((tab) => tab.addEventListener("click", () => showDriftTab(tab.dataset.driftTab)));
      function renderDriftResult({ notEvaluated = false, path = driftPath(), id = driftSerial, meta = "Manual · simulação · report recebido do workflow GitHub" } = {}) {
        root.querySelector("#drift-report-scope").textContent = `${driftRepo.value} › ${path}`;
        root.querySelector("#drift-run-id").textContent = `#${id}`;
        root.querySelector("#drift-report-meta").textContent = meta;
        root.querySelector("#drift-result-badge").textContent = notEvaluated ? "Não avaliado · baseline" : "Drift detectado";
        root.querySelector("#drift-result-badge").className = notEvaluated ? "badge b-conflict" : "badge b-manual";
        root.querySelector("#drift-report-stats").innerHTML = notEvaluated
          ? '<div class="drift-stat"><span>Criar</span><b>—</b></div><div class="drift-stat"><span>Alterar</span><b>—</b></div><div class="drift-stat"><span>Destruir</span><b>—</b></div>'
          : '<div class="drift-stat"><span>Criar</span><b>0</b></div><div class="drift-stat"><span>Alterar</span><b>1</b></div><div class="drift-stat"><span>Destruir</span><b>0</b></div>';
        root.querySelector("#drift-attribute-diff").textContent = notEvaluated
          ? "Plan não produzido. O workflow não encontrou baseline/state acessível para este escopo. Resultado: Not evaluated."
          : driftRepo.value === "platform/iac-services"
            ? "~ aws_iam_role.payments_api_role\n    name = \"payments-api-prod-role\"\n~ max_session_duration: 3600 → 7200\n    # Código e alias Lambda pertencem ao deploy pipeline; fora desta comparação."
            : "~ aws_db_instance.banco_x\n    identifier = \"banco-x\"\n~ backup_retention_period: 1 → 7\n~ deletion_protection: false → true";
      }
      root.querySelector("#drift-run").addEventListener("click", (event) => {
        const button = event.currentTarget;
        const status = root.querySelector("#drift-run-status");
        const unavailable = root.querySelector("#drift-scope").value === "resource" && root.querySelector("#drift-resource").value === "banco-y-sem-baseline";
        if (unavailable) {
          status.textContent = "Não avaliado: o workflow não conseguiu carregar baseline para este recurso. Nenhuma contagem de drift foi inferida.";
          renderDriftResult({ notEvaluated: true, path: driftPath(), meta: "Manual · workflow concluído · sem baseline · plan não produzido" });
          return;
        }
        button.disabled = true;
        status.textContent = "Simulação: workflow GitHub Actions iniciado; aguardando o summary do plan…";
        window.setTimeout(() => {
          driftSerial += 1;
          renderDriftResult({ path: driftPath(), id: driftSerial, meta: "Manual · simulação concluída agora · GitHub Actions · plan · commit 5fd2c41" });
          status.textContent = "Simulação concluída. O report do plan está disponível nesta tela.";
          button.disabled = false;
          const row = document.createElement("tr");
          row.innerHTML = `<td>#${driftSerial}<br><span class="drift-muted">Agora · 1m 06s</span></td><td>${driftRepo.value.replace("platform/", "")} › ${driftPath().replace(`${driftRepo.value.replace("platform/", "")} › `, "")}</td><td>Manual</td><td><span class="badge b-manual">Drift detectado</span></td><td>5fd2c41 ↗</td>`;
          root.querySelector("#drift-history-rows").prepend(row);
        }, 900);
      });
      root.querySelector("#drift-github-link").addEventListener("click", () => { root.querySelector("#drift-github-status").textContent = "Protótipo: aqui abrirá a URL do workflow/run que forneceu este report."; });

      function cronData(repo) {
        return repo === "platform/iac-core" ? "0 6 * * *" : repo === "platform/iac-data" ? "0 9 * * 1-5" : "0 */6 * * *";
      }
      function updateCronDiff() {
        if (!scheduleTarget) return;
        const oldCron = cronData(scheduleTarget);
        proposedCron = root.querySelector("#cron-input").value.trim();
        root.querySelector("#cron-diff").textContent = `.github/workflows/drift.yml\n  schedule:\n-   - cron: \"${oldCron}\"\n+   - cron: \"${proposedCron}\"`;
        root.querySelector("#cron-status").textContent = proposedCron ? "Prévia local do diff · nenhum arquivo ou repositório foi alterado." : "Informe uma expressão cron.";
      }
      root.querySelectorAll("[data-edit-cron]").forEach((button) => button.addEventListener("click", () => {
        scheduleTarget = button.dataset.editCron;
        root.querySelector("#cron-editor").hidden = false;
        root.querySelector("#cron-repo").textContent = `${scheduleTarget} · branch main · schedule atual: ${cronData(scheduleTarget)}`;
        root.querySelector("#cron-input").value = scheduleTarget.endsWith("core") ? "0 8 * * *" : scheduleTarget.endsWith("data") ? "0 10 * * 1-5" : "0 */4 * * *";
        root.querySelector("#cron-pr").disabled = false;
        root.querySelector("#cron-pr").textContent = "Criar PR (simulação)";
        root.querySelector("#cron-status").textContent = "";
        updateCronDiff();
      }));
      root.querySelector("#cron-input").addEventListener("input", updateCronDiff);
      root.querySelector("#cron-cancel").addEventListener("click", () => { root.querySelector("#cron-editor").hidden = true; });
      function validCron(value) {
        const fields = value.split(/\s+/);
        const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
        return fields.length === 5 && fields.every((field, index) => field.split(",").every((part) => {
          const match = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
          if (!match) return false;
          if (match[2] && (+match[2] < 1 || +match[2] > ranges[index][1])) return false;
          if (match[1] === "*") return true;
          const values = match[1].split("-").map(Number);
          return values.every((number) => number >= ranges[index][0] && number <= ranges[index][1]) && (values.length < 2 || values[0] <= values[1]);
        }));
      }
      root.querySelector("#cron-pr").addEventListener("click", (event) => {
        if (!scheduleTarget || !validCron(proposedCron || "")) {
          root.querySelector("#cron-status").textContent = "Informe uma expressão cron numérica válida com cinco campos.";
          return;
        }
        if (proposedCron === cronData(scheduleTarget)) {
          root.querySelector("#cron-status").textContent = "O cron proposto é igual ao cron vigente.";
          return;
        }
        const row = root.querySelector(`[data-schedule-repo="${scheduleTarget}"]`);
        let pending = row.querySelector(".cron-pending");
        if (!pending) {
          pending = document.createElement("div");
          pending.className = "cron-pending";
          row.children[1].append(pending);
        }
        pending.textContent = `PR simulada pendente · proposta ${proposedCron} · cron atual permanece ativo`;
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = "PR simulada registrada ✓";
        root.querySelector("#cron-status").textContent = `Simulação: proposta para ${scheduleTarget}. O schedule atual (${cronData(scheduleTarget)}) continua vigente até merge.`;
      });
      root.querySelector("#investigate-btn").addEventListener("click", () => navigate("findings"));
      root.querySelector("#settings-provider").addEventListener("change", () => { root.querySelector("#settings-status").textContent = "Preferência local atualizada."; });
      root.querySelector("#settings-region").addEventListener("change", () => { root.querySelector("#settings-status").textContent = "Região demonstrativa atualizada."; });
      root.querySelector("#settings-federated").addEventListener("change", event => { root.querySelector("#settings-status").textContent = event.currentTarget.checked ? "State federado indicado como opcional (sem conexão)." : "State federado oculto."; });
      root.querySelector("#reset-demo").addEventListener("click", () => {
        search.value = ""; regionFilter.value = ""; catalogFilter.value = ""; activeClass = null;
        root.querySelectorAll(".class-tile").forEach(tile => tile.classList.remove("active"));
        rows.forEach(row => row.classList.remove("selected"));
        selectedResourceId = "payments";
        const first = rows.find(row => row.dataset.id === selectedResourceId) || rows[0];
        first.classList.add("selected"); first.click();
        root.querySelector("#settings-federated").checked = false;
        root.querySelector("#settings-region").selectedIndex = 0;
        filterRows();
        root.querySelector("#settings-status").textContent = "Demonstração restaurada. Nenhum estado externo foi alterado.";
        navigate("overview");
      });
      root.querySelector("#run-discovery").setAttribute("aria-label", "Simular scan local de discovery");
      const state = { density: "Confortável" };
      if (globalThis.Tweak) {
        const tweak = new Tweak({ container: root, onChange: () => root.classList.toggle("compact", state.density === "Compacta") });
        tweak.addSelect(state, "density", { label: "Densidade da lista", options: ["Confortável", "Compacta"] });
      }
    })();

