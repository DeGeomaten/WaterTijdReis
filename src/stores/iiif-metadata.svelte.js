export async function getIIIFManifest(edition = ['editie-1', 'editie-2', 'editie-3','editie-4','editie-5']) {
  const manifests = await Promise.all(
    edition.map((edition) =>
      fetch(`/metadata-${edition}.json`)
        .then((response) => response.json())
        .then((data) => {
          return data;
        })
        .catch((error) => {
          console.error(`Error fetching ${edition}.json:`, error);
          return null;
        })
    )
  );

  return manifests.reduce((acc, manifest, index) => {
    if (manifest) {
      acc[edition[index]] = manifest;
    }
    return acc;
  }, {});
}

export async function getIIIFMetadata() {
  return {
    'editie-1': await fetch('/metadata-editie-1.json')
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error('Error fetching metadata-editie-1.json:', error);
        return null;
      }),
    'editie-2': await fetch('/metadata-editie-2.json')
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error('Error fetching metadata-editie-2.json:', error);
        return null;
      }),
    'editie-3': await fetch('/metadata-editie-3.json')
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error('Error fetching metadata-editie-3.json:', error);
        return null;
      }),
    'editie-4': await fetch('/metadata-editie-4.json')
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error('Error fetching metadata-editie-4.json:', error);
        return null;
      }),
    'editie-5': await fetch('/metadata-editie-5.json')
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error('Error fetching metadata-editie-5.json:', error);
        return null;
      })
  } 
}