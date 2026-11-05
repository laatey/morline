import { z } from 'zod';
const id=z.string().min(1).max(200), field=z.object({key:z.string().min(1),value:z.string(),secret:z.boolean().default(true)});
const enc=encodeURIComponent;
export const tools = [
 ['get_account','Read the signed-in account and teams',{},()=>['GET','/me']],
 ['list_projects','List projects in a team',{teamId:id},a=>['GET',`/teams/${enc(a.teamId)}/projects`]],
 ['get_project','Read project details',{projectId:id},a=>['GET',`/projects/${enc(a.projectId)}`]],
 ['list_environments','List project environments',{projectId:id},a=>['GET',`/projects/${enc(a.projectId)}/environments`]],
 ['list_services','List services in an environment',{environmentId:id},a=>['GET',`/environments/${enc(a.environmentId)}/services`]],
 ['get_service','Read service details',{serviceId:id},a=>['GET',`/services/${enc(a.serviceId)}`]],
 ['list_deployments','Read recent deployments',{serviceId:id},a=>['GET',`/services/${enc(a.serviceId)}/deployments?limit=20`]],
 ['get_deployment','Read deployment details',{deploymentId:id},a=>['GET',`/deployments/${enc(a.deploymentId)}`]],
 ['deploy_service','Deploy the current remote service configuration; only on user request',{serviceId:id},a=>['POST',`/services/${enc(a.serviceId)}/deployments`,{}]],
 ['restart_service','Restart a service; only on user request',{serviceId:id},a=>['POST',`/services/${enc(a.serviceId)}/restart`,{}]],
 ['stop_service','Stop a service; only on user request',{serviceId:id},a=>['POST',`/services/${enc(a.serviceId)}/stop`,{}]],
 ['get_logs','Read recent deployment logs',{deploymentId:id,phase:z.enum(['build','deploy']).optional(),limit:z.number().int().min(1).max(500).default(100)},a=>['GET',`/deployments/${enc(a.deploymentId)}/logs?limit=${a.limit}${a.phase?`&phase=${a.phase}`:''}`]],
 ['list_variables','List variable keys; values are redacted',{serviceId:id},a=>['GET',`/services/${enc(a.serviceId)}/variables`]],
 ['set_variables','Upsert variables without replacing others; only on user request',{serviceId:id,variables:z.array(field).min(1).max(100)},a=>['POST',`/services/${enc(a.serviceId)}/variables`,{variables:a.variables}]],
 ['get_metrics','Read service resource metrics',{serviceId:id},a=>['GET',`/services/${enc(a.serviceId)}/metrics`]],
 ['analyze_deployment','Start AI diagnosis of a failed deployment; only on user request',{deploymentId:id},a=>['POST',`/deployments/${enc(a.deploymentId)}/diagnosis`,{}]],
 ['get_diagnosis','Read an existing AI deployment diagnosis',{deploymentId:id},a=>['GET',`/deployments/${enc(a.deploymentId)}/diagnosis`]],
 ['create_fix_pull_request','Create a proposed fix pull request; requires explicit user approval',{deploymentId:id,confirmed:z.literal(true)},a=>['POST',`/deployments/${enc(a.deploymentId)}/diagnosis/pull-request`,{}]],
];
export function redactVariables(result) {
  return {data:(result.data || []).map(v=>({key:v.key,secret:Boolean(v.secret),value:'[redacted]'}))};
}
export async function runTool(name,args,call) {
 const definition=tools.find(t=>t[0]===name); if(!definition) throw new Error('Unknown tool');
 const parsed=z.object(definition[2]).strict().parse(args), [method,path,body]=definition[3](parsed);
 const result=await call(method,path,body);
 if(name==='list_variables') return redactVariables(result);
 if(name==='set_variables') return {updated:parsed.variables.map(v=>v.key),staged:true};
 return result;
}
