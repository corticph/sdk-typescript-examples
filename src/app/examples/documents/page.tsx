'use client';

import {useContext, useEffect, useState} from "react";
import { Corti } from "@corti/core";
import {AuthContext} from "@/common/AuthContext";
import {JsonComponent} from "@/common/JsonComponents";

export default function Page() {
    const { cortiClient } = useContext(AuthContext);

    const [interaction, setInteraction] = useState<Corti.ResponseInteractionCreate | null>(null);
    const [documentsList, setDocumentsList] = useState<Corti.ResponseDocumentList | null>(null);
    const [createdDocument, setCreatedDocument] = useState<Corti.ResponseDocumentRead | null>(null);
    const [retrievedDocument, setRetrievedDocument] = useState<Corti.ResponseDocumentRead | null>(null);
    const [updatedDocument, setUpdatedDocument] = useState<Corti.ResponseDocumentRead | null>(null);

    const handleUpdate = async () => {
        setInteraction(null);
        setDocumentsList(null);
        setCreatedDocument(null);
        setRetrievedDocument(null);
        setUpdatedDocument(null);

        if (!cortiClient) return;

        try {
            // Create interaction
            const interactionResponse = await cortiClient.interactions.create({
                encounter: {
                    identifier: Date.now().toString(),
                    status: 'planned',
                    type: 'first_consultation',
                },
                patient: {
                    identifier: Date.now().toString(),
                    gender: 'unknown'
                }
            });
            setInteraction(interactionResponse);

            // List documents (should be empty initially)
            const documentsListResponse = await cortiClient.documents.list(interactionResponse.interactionId);
            setDocumentsList(documentsListResponse);

            // Create a document with facts context
            const createdDocumentResponse = await cortiClient.documents.create(interactionResponse.interactionId, {
                context: [{
                    type: "facts",
                    data: [{
                        text: "Patient has trouble breathing",
                        source: "core"
                    }, {
                        text: "Patient is experiencing chest pain",
                        source: "user"
                    }]
                }],
                templateKey: "corti-patient-summary",
                outputLanguage: "en",
                name: "Patient Consultation Note"
            });
            setCreatedDocument(createdDocumentResponse);

            // Get the created document
            const retrievedDocumentResponse = await cortiClient.documents.get(interactionResponse.interactionId, createdDocumentResponse.id!);
            setRetrievedDocument(retrievedDocumentResponse);

            // Update the document
            const updatedDocumentResponse = await cortiClient.documents.update(interactionResponse.interactionId, createdDocumentResponse.id!, {
                sections: [{
                    key: "chief-complaint",
                    text: "Patient reports severe trouble breathing and chest pain"
                }]
            });
            setUpdatedDocument(updatedDocumentResponse);

            // Delete the document
            await cortiClient.documents.delete(interactionResponse.interactionId, createdDocumentResponse.id!);

            // Clean up - delete the interaction
            await cortiClient.interactions.delete(interactionResponse.interactionId);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    }

    useEffect(() => {
        void handleUpdate();
    }, []);

    return (
        <div>
            <button onClick={handleUpdate}>Update again</button>
            <div>Interaction: <JsonComponent data={interaction} /></div>
            <div>Documents List: <JsonComponent data={documentsList} /></div>
            <div>Created Document: <JsonComponent data={createdDocument} /></div>
            <div>Retrieved Document: <JsonComponent data={retrievedDocument} /></div>
            <div>Updated Document: <JsonComponent data={updatedDocument} /></div>
        </div>
    );
} 