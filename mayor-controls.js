/* Controles extras da Prefeitura: recompensas e contas. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));

  const icon=id=>({
    estudante:'🎓',
    entregador:'📦',
    mecanico:'🔧',
    professor:'📚',
    policial:'🛡️',
    investigador:'🔎',
    advogado:'⚖️',
    engenheiro:'🏗️',
    medico:'⚕️',
    juiz:'👨‍⚖️',
    comerciante:'🛍️',
    motorista:'🚗',
    enfermeiro:'🩺',
    programador:'💻',
    administrador:'💼'
  }[id]||'💼');

  function styles(){
    if(document.getElementById('mayor-controls-style'))return;

    const s=document.createElement('style');
    s.id='mayor-controls-style';

    s.textContent=`
      .mayor-management-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:18px;
        margin-top:22px
      }

      .mayor-management-box{
        padding:22px;
        border:1px solid rgba(255,255,255,.1);
        border-radius:18px;
        background:rgba(20,20,30,.55)
      }

      .mayor-management-box h3{
        margin:0 0 6px
      }

      .mayor-management-box p{
        margin:0 0 16px;
        opacity:.7
      }

      .mayor-reward-list{
        display:grid;
        gap:14px;
        max-height:60vh;
        overflow:auto;
        padding:4px
      }

      .mayor-reward-card{
        padding:16px;
        border:1px solid rgba(255,255,255,.1);
        border-radius:14px;
        background:rgba(255,255,255,.03)
      }

      .mayor-reward-title{
        display:flex;
        gap:12px;
        align-items:center;
        margin-bottom:12px
      }

      .mayor-reward-title>span{
        font-size:25px
      }

      .mayor-reward-title strong,
      .mayor-reward-title small{
        display:block
      }

      .mayor-reward-title small{
        opacity:.6;
        margin-top:3px
      }

      .mayor-reward-fields{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px
      }

      .mayor-reward-fields label{
        font-size:12px;
        opacity:.8
      }

      .mayor-reward-fields input{
        display:block;
        width:100%;
        box-sizing:border-box;
        margin-top:5px
      }

      .mayor-account-list{
        display:grid;
        gap:10px;
        max-height:60vh;
        overflow:auto
      }

      .mayor-account-card{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:14px;
        border:1px solid rgba(255,255,255,.1);
        border-radius:12px;
        background:rgba(255,255,255,.03)
      }

      .mayor-account-card strong,
      .mayor-account-card small{
        display:block
      }

      .mayor-account-card small{
        opacity:.65;
        margin-top:4px
      }

      .mayor-delete-btn{
        color:#ff8d8d
      }

      .mayor-account-open{
        display:flex!important;
        align-items:center;
        gap:12px
      }

      .mayor-account-open span{
        font-size:22px
      }
    `;

    document.head.appendChild(s)
  }

  window.manageRewards=async function(){
    try{
      const [r,j]=await Promise.all([
        api('/api/mayor/rewards'),
        api('/api/jobs')
      ]);

      const rewards=r.missionRewards||{};

      openModal(`
        <div class="mayor-modal">

          <div class="mayor-modal-head">
            <div>
              <span class="eyebrow">PREFEITURA • MISSÕES</span>

              <h2>Recompensas das missões</h2>

              <p>
                Altere dinheiro, XP e quantidade de perguntas de cada profissão.
              </p>
            </div>
          </div>

          <div class="mayor-reward-list">

            ${(j.jobs||[]).map(job=>{

              const x=rewards[job.id]||{
                moneyPerMission:50,
                xpPerMission:20,
                questionsPerMission:2
              };

              return `
                <div class="mayor-reward-card">

                  <div class="mayor-reward-title">
                    <span>${icon(job.id)}</span>

                    <div>
                      <strong>${esc(job.name)}</strong>

                      <small>
                        ${esc(job.task||'Missões desta profissão')}
                      </small>
                    </div>
                  </div>

                  <div class="mayor-reward-fields">

                    <label>
                      💰 Dinheiro

                      <input
                        class="reward-money"
                        data-job="${esc(job.id)}"
                        type="number"
                        min="0"
                        value="${Number(x.moneyPerMission||0)}"
                      >
                    </label>

                    <label>
                      ⭐ XP

                      <input
                        class="reward-xp"
                        data-job="${esc(job.id)}"
                        type="number"
                        min="0"
                        value="${Number(x.xpPerMission||0)}"
                      >
                    </label>

                    <label>
                      ❓ Perguntas

                      <input
                        class="reward-questions"
                        data-job="${esc(job.id)}"
                        type="number"
                        min="1"
                        max="10"
                        value="${Number(x.questionsPerMission||2)}"
                      >
                    </label>

                  </div>

                </div>
              `;

            }).join('')}

          </div>

          <button
            class="primary wide"
            onclick="saveMissionRewards()"
          >
            💾 Salvar recompensas
          </button>

        </div>
      `);

    }catch(e){
      toast(e.message,'error')
    }
  };

  window.saveMissionRewards=async function(){
    try{
      const missionRewards={};

      document.querySelectorAll('.reward-money').forEach(input=>{

        const id=input.dataset.job;

        missionRewards[id]={
          moneyPerMission:Number(input.value)||0,

          xpPerMission:Number(
            document.querySelector(
              `.reward-xp[data-job="${CSS.escape(id)}"]`
            )?.value
          )||0,

          questionsPerMission:Number(
            document.querySelector(
              `.reward-questions[data-job="${CSS.escape(id)}"]`
            )?.value
          )||1
        };

      });

      const d=await post(
        '/api/mayor/rewards',
        {missionRewards}
      );

      toast(
        d.message||'Recompensas salvas!'
      );

      closeModal();

      loadPage('mayor');

    }catch(e){
      toast(e.message,'error')
    }
  };

  window.manageAccounts=async function(){
    try{
      const d=await api('/api/mayor/users');

      openModal(`
        <div class="mayor-modal">

          <div class="mayor-modal-head">
            <div>

              <span class="eyebrow">
                PREFEITURA • ADMINISTRAÇÃO
              </span>

              <h2>Gerenciar contas</h2>

              <p>
                Veja os cidadãos cadastrados e exclua uma conta quando necessário.
              </p>

            </div>
          </div>

          <div class="mayor-account-list">

            ${(d.users||[]).length

              ? (d.users||[]).map(u=>`

                <div class="mayor-account-card">

                  <div>

                    <strong>
                      ${esc(u.name||u.username)}
                    </strong>

                    <small>
                      @${esc(u.username)}
                      • ${esc(u.jobName||'Estudante')}
                      • Nível ${Number(u.level||1)}
                    </small>

                  </div>

                  <button
                    class="ghost mayor-delete-btn"
                    onclick="deleteMayorAccount(
                      '${encodeURIComponent(u.username)}',
                      '${esc(u.name||u.username)}'
                    )"
                  >
                    🗑️ Excluir
                  </button>

                </div>

              `).join('')

              : `

                <div class="empty">

                  <div>👥</div>

                  <h3>
                    Nenhuma conta para administrar
                  </h3>

                </div>

              `
            }

          </div>

        </div>
      `);

    }catch(e){
      toast(e.message,'error')
    }
  };

  window.deleteMayorAccount=async function(username,name){

    if(
      !confirm(
        `Tem certeza que deseja excluir a conta de ${name}? Esta ação não pode ser desfeita.`
      )
    )return;

    try{

      const d=await api(
        `/api/mayor/users/${username}`,
        {method:'DELETE'}
      );

      toast(
        d.message||'Conta excluída!'
      );

      manageAccounts();

    }catch(e){
      toast(e.message,'error')
    }
  };

  function attach(){

    styles();

    if(
      typeof window.mayorPage!=='function'||
      typeof window.mayorSection!=='function'
    ){
      setTimeout(attach,100);
      return;
    }

    if(window.mayorPage.__sorokibaControls)return;

    const originalPage=window.mayorPage;
    const originalSection=window.mayorSection;

    const page=async function(box){

      await originalPage(box);

      if(!isMayor)return;

      const quick=box.querySelector('.mayor-quick-grid');

      if(
        quick&&
        !quick.querySelector('[data-accounts]')
      ){

        const b=document.createElement('button');

        b.setAttribute(
          'data-accounts',
          '1'
        );

        b.className='mayor-account-open';

        b.onclick=()=>manageAccounts();

        b.innerHTML=`
          <span>👥</span>

          <div>
            <strong>
              Gerenciar contas
            </strong>

            <small>
              Veja e exclua contas de cidadãos.
            </small>
          </div>

          <b>→</b>
        `;

        quick.appendChild(b);
      }
    };

    page.__sorokibaControls=true;

    window.mayorPage=page;

    window.mayorSection=function(type){

      if(type==='rewards')
        return manageRewards();

      if(type==='accounts')
        return manageAccounts();

      return originalSection(type);
    };
  }

  attach();

})();
