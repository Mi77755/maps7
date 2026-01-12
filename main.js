
window.onload = () => {
  const mapContainer = document.getElementById('map');
  const projectList = document.getElementById('project-list');

  const rightPanel = document.getElementById('right-panel');
  const rightTitle = document.getElementById('right-title');
  const rightDesc = document.getElementById('right-desc');
  const editForm = document.getElementById('edit-form');
  const editName = document.getElementById('edit-name');
  const editDesc = document.getElementById('edit-desc');
  const editCity = document.getElementById('edit-city');
  const saveBtn = document.getElementById('save-project');
  const editBtn = document.getElementById('edit-btn');

  const form = document.getElementById('project-form');

  let projects = [];
  let editKey = null;

  // Инициализация карты
  const map = new maplibregl.Map({
    container: mapContainer,
    style: {
      version: 8,
      sources: {
        'italy-map': {
          type: 'image',
          url: 'img/italy.png',
          coordinates: [
            [6.627, 47.092],
            [18.520, 47.092],
            [18.520, 36.640],
            [6.627, 36.640]
          ]
        }
      },
      layers: [{
        id: 'italy-layer',
        type: 'raster',
        source: 'italy-map',
        paint: { 'raster-opacity': 1 }
      }]
    },
    center: [12.5, 42.5],
    zoom: 5,
    scrollZoom: false,
    dragPan: true // можно отключить, если нужно
  });

// ❌ полностью фиксируем карту
  map.dragPan.disable();
  map.scrollZoom.disable();
  map.doubleClickZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();
  map.touchZoomRotate.disable();

  function addProjectToMap(project) {
  if (project.marker) return;

  // контейнер маркера
  const el = document.createElement('div');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.alignItems = 'center';
  el.style.transform = 'translate(-50%, -100%)'; // важное!
  el.style.cursor = 'pointer';

  // иконка
  const icon = document.createElement('div');
  icon.style.width = '15px';
  icon.style.height = '15px';
  icon.style.backgroundImage = 'url("img/circle.png")';
  icon.style.backgroundSize = 'contain';
  icon.style.backgroundRepeat = 'no-repeat';

  // подпись
  const label = document.createElement('div');
  label.textContent = project.name;
  label.style.fontSize = '11px';
  label.style.whiteSpace = 'nowrap';
  label.style.background = 'rgba(255,255,255,0.85)';
  label.style.padding = '2px 5px';
  label.style.borderRadius = '4px';
  label.style.marginTop = '2px';
  label.style.pointerEvents = 'none'; // важно!

  el.appendChild(icon);
  el.appendChild(label);

  const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([project.lng, project.lat])
    .addTo(map);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetails(project);
  });

  project.marker = marker;
}
  // Открытие правой панели с информацией
  function openDetails(project) {
    rightPanel.classList.add('active');
    rightTitle.textContent = project.name;
    rightDesc.textContent = project.description;
    editForm.style.display = 'none';
    editBtn.style.display = 'block';
    editKey = project.key;
  }

  // Кнопка редактирования открывает форму вместо описания
  editBtn.onclick = () => {
    editForm.style.display = 'block';
    editBtn.style.display = 'none';
    editName.value = rightTitle.textContent;
    editDesc.value = rightDesc.textContent;
  };

  // Сохранение редактирования
  saveBtn.onclick = () => {
    const updated = {
      name: editName.value.trim(),
      description: editDesc.value.trim(),
      lat: null,
      lng: null
    };

    const project = projects.find(p => p.key === editKey);
    if (!project) return;

    updated.lat = project.lat;
    updated.lng = project.lng;

    projectsRef.child(editKey).set(updated);
    editForm.style.display = 'none';
    editBtn.style.display = 'block';

    rightTitle.textContent = updated.name;
    rightDesc.textContent = updated.description;

    // обновляем маркер popup
    if (project.marker) project.marker.getPopup().setText(updated.name);
  };

  // Обновление списка проектов в левой панели
  function updateProjectList() {
    projectList.innerHTML = '';
    projects.forEach(p => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.overflow = 'hidden';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = p.name;
      nameSpan.style.whiteSpace = 'nowrap';
      nameSpan.style.overflow = 'hidden';
      nameSpan.style.textOverflow = 'ellipsis';
      nameSpan.style.flex = '1';
      nameSpan.style.marginRight = '5px';

      const delBtn = document.createElement('button');
      delBtn.textContent = '❌';
      delBtn.onclick = () => {
        if(p.marker) p.marker.remove();
        projectsRef.child(p.key).remove();
      };

      const editLiBtn = document.createElement('button');
      editLiBtn.textContent = '✏️';
      editLiBtn.onclick = () => openDetails(p);

      li.appendChild(nameSpan);
      li.appendChild(delBtn);
      li.appendChild(editLiBtn);
      projectList.appendChild(li);
    });
  }

  // Подгрузка проектов из Firebase
  projectsRef.on('value', snapshot => {
    const data = snapshot.val() || {};
    projects.length = 0;
    Object.keys(data).forEach(key => {
      const p = data[key];
      p.key = key;
      projects.push(p);
      addProjectToMap(p);
    });
    updateProjectList();
  });

  // Добавление нового проекта
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('proj-name').value.trim();
    const desc = document.getElementById('proj-desc').value.trim();
    const city = document.getElementById('proj-city').value.trim();

    let coords = { lat: 42.5, lng: 12.5 };
    if (city) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&countrycodes=IT`);
        const data = await res.json();
        if (data.length === 0) { alert("Città non trovata"); return; }
        coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      } catch(err) {
        alert("Errore nella ricerca della città"); 
        return;
      }
    }

    const newProjRef = projectsRef.push();
    const project = { name, description: desc, lat: coords.lat, lng: coords.lng, key: newProjRef.key };
    newProjRef.set(project);
    projects.push(project);
    addProjectToMap(project);
    updateProjectList();

    form.reset();
  });
};
