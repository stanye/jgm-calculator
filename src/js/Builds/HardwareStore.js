import {Building, BuildingRarity, BuildingType} from "../Building";
import {Buff, BuffRange} from "../Buff";
import PartsFactory from "./PartsFactory";

class HardwareStore extends Building{
    constructor(){
        super("五金店",BuildingRarity.Common,BuildingType.Business,1);
    }

    initBuffs(){
        this.buffs.push(new Buff(BuffRange.Targets,new PartsFactory().BuildingName,1));
    }
}

export default HardwareStore