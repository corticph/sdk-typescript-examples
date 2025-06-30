'use client';

import {useContext, useEffect, useState} from "react";
import { Corti } from "@corti/sdk";
import {AuthContext} from "@/common/AuthContext";
import {JsonComponent} from "@/common/JsonComponents";

export default function Page() {
    const { cortiClient } = useContext(AuthContext);

    const [allTemplates, setAllTemplates] = useState<Corti.ResponseAllTemplates | null>(null);
    const [filteredTemplates, setFilteredTemplates] = useState<Corti.ResponseAllTemplates | null>(null);
    const [templateSections, setTemplateSections] = useState<Corti.ResponseAllTemplateSections | null>(null);
    const [specificTemplate, setSpecificTemplate] = useState<Corti.TemplateFiltered | null>(null);

    const handleUpdate = async () => {
        setAllTemplates(null);
        setFilteredTemplates(null);
        setTemplateSections(null);
        setSpecificTemplate(null);

        if (!cortiClient) return;

        try {
            const allTemplatesResponse = await cortiClient.templates.list();
            setAllTemplates(allTemplatesResponse);

            const filteredTemplatesResponse = await cortiClient.templates.list({
                lang: 'en',
                status: 'active'
            });
            setFilteredTemplates(filteredTemplatesResponse);

            const templateSectionsResponse = await cortiClient.templates.sectionsList();
            setTemplateSections(templateSectionsResponse);

            if (allTemplatesResponse.data && allTemplatesResponse.data.length > 0) {
                const firstTemplate = allTemplatesResponse.data[0];
                if (firstTemplate.key) {
                    const specificTemplateResponse = await cortiClient.templates.get(firstTemplate.key);
                    setSpecificTemplate(specificTemplateResponse);
                }
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    }

    useEffect(() => {
        void handleUpdate();
    }, []);

    return (
        <div>
            <button onClick={handleUpdate}>Update again</button>
            <div>All Templates: <JsonComponent data={allTemplates} /></div>
            <div>Filtered Templates: <JsonComponent data={filteredTemplates} /></div>
            <div>Template Sections: <JsonComponent data={templateSections} /></div>
            <div>Specific Template: <JsonComponent data={specificTemplate} /></div>
        </div>
    );
} 