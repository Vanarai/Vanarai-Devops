import { LightningElement, wire, track } from 'lwc';
import getWIPRecords from '@salesforce/apex/dailyProgress.getWIPRecords';
import getChildRecords from '@salesforce/apex/dailyProgress.getChildRecords';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import createRecords from '@salesforce/apex/dailyProgress.createRecords';

export default class DailyProgress extends LightningElement {
    @track wipRecords = [];
    @track dailyProgressRecords = [];
    @track selectedWIPId;
    @track columnsWIP = [
        { label: 'WIP Name', fieldName: 'Name' },
        { label: 'UOM', fieldName: 'vnr_wip_UOM__c' },
        //{ label: 'Total Work', fieldName: 'totalWork__c' }
    ];
    @track columnsDailyProgress = [
        { label: 'Date', fieldName: 'Date__c', type: 'date', editable: true },
        { label: 'Quantity', fieldName: 'Quantity__c', type:'number', editable: true },
        {label: 'Issue ', fieldName:'Issues_Faced__c',type:'text',editable:true}
    ];

    programId;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.programId = currentPageReference.attributes?.recordId;
        }
    }

    // Fetch WIP Records based on Program ID
    @wire(getWIPRecords, { programId: '$programId' })
    wiredWIPRecords({ error, data }) {
        if (data) {
            this.wipRecords = data;
        } else if (error) {
            this.showError(error);
        }
    }

    // Fetch Daily Progress records based on selected WIP ID
    @wire(getChildRecords, { wipId: '$selectedWIPId' })
    wiredDailyProgress({ error, data }) {
        if (data) {
            this.dailyProgressRecords = data;
        } else if (error) {
            this.showError(error);
        }
    }

    // Handle WIP record selection
    handleWIPSelection(event) {
        const selectedRows = event.detail.selectedRows;
        if (selectedRows.length > 0) {
            this.selectedWIPId = selectedRows[0].Id;
        }
    }

    // Add a new row to the Daily Progress table
    handleAddRow() {
        const newRow = {
            Date__c: '',  // Initially empty
            Quantity__c: null,  // Initially null (not 0)
            WIP__c: this.selectedWIPId  // Set the selected WIP Id
        };
        this.dailyProgressRecords = [...this.dailyProgressRecords, newRow];
    }

    // Create new Daily Progress records with user input
    handleCreate() {
        const newRecords = this.dailyProgressRecords.filter(record => !record.Id || record.Id.startsWith('new_'));

        if (newRecords.length > 0) {
            // Ensure that Quantity__c has the correct user input
            newRecords.forEach(record => {
                // Check if the user has inputted a value for Quantity__c, otherwise set to 0 (if needed)
                if (record.Quantity__c === null || record.Quantity__c === undefined) {
                   this.showSuccess('Quantity Created');
                   
                  //  record.Quantity__c = 0;  // Default to 0 if no input provided
                }

                // Ensure WIP__c is set for the new records
                record.WIP__c = this.selectedWIPId;
            });

            // Call the Apex method to create the records
            createRecords({ progressRecordsToInsert: newRecords })
                .then(result => {
                    this.showSuccess('Records created successfully.');
                    // Reset the table after successful creation
                    this.dailyProgressRecords = [];
                })
                .catch(error => {
                    this.showError(error);
                });
        } else {
            this.showError('No new rows to create.');
        }
    }

    // Show success message
    showSuccess(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Success',
            message: message,
            variant: 'success',
        }));
    }

    // Show error message
    showError(error) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: error.body ? error.body.message : error.message,
            variant: 'error',
        }));
    }
}