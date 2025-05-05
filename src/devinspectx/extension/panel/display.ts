import { ui } from './ui_elements';


export function displayObjectDetails(data: any) {
    console.log('Displaying object details:', data);
    if (ui.detailsContainer) {
        ui.detailsContainer.innerHTML =
            '<div>Object details received</div>';
    }
}

export function displayEntityDetails(data: any) {
    console.log('Displaying entity details:', data);
    if (ui.detailsContainer) {
        ui.detailsContainer.innerHTML =
            '<div>Entity details received</div>';
    }
}

export function displayComponentDetails(data: any) {
    console.log('Displaying component details:', data);
    if (ui.detailsContainer) {
        ui.detailsContainer.innerHTML =
            '<div>Component details received</div>';
    }
}

export function displaySystemDetails(data: any) {
    console.log('Displaying system details:', data);
    if (ui.detailsContainer) {
        ui.detailsContainer.innerHTML =
            '<div>System details received</div>';
    }
}
