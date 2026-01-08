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
            [18.520, 36.650],
            [6.627, 36.650]
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

  // Добавление маркера на карту
  function addProjectToMap(project) {
    if (project.marker) return;

    const el = document.createElement('div');
    el.className = 'project-marker';
    el.style.width = '15px';
    el.style.height = '15px';
    el.style.backgroundImage = 'url("img/circle.png")';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.cursor = 'pointer';

    // Поп-ап с названием проекта
    const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
      .setText(project.name);

    const marker = new maplibregl.Marker(el)
      .setLngLat([project.lng, project.lat])
      .setPopup(popup)
      .addTo(map);

    // Клик открывает правую панель
    el.addEventListener('click', (e) => {
      e.stopPropagation(); // чтобы карта не перехватывала
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